"""The Core LLM Reasoning Loop — GDS OS Agentic Engine.

Agents use OpenAI GPT-4.1 function calling to decide which tools to use
and in what order. No pre-programmed routing — agents REASON.
"""
import os, sys, json, asyncio, time, logging
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger("gds.reasoning")

try:
    from openai import AsyncOpenAI
except ImportError:
    logger.error("openai package not installed. Run: pip install openai")
    raise

# Import tool gateway functions directly (this is what the module actually exports)
from gds_api.tool_gateway import execute_tool, list_tools, TOOL_REGISTRY
from gds_api.reasoning.prompts import get_agent_prompt, AGENT_REGISTRY
from gds_api.reasoning.tool_definitions import get_tool_definitions, get_tool_names
from gds_api.reasoning.kernel_agent_loop import run_kernel_agent


@dataclass
class ToolCall:
    """Record of a single tool call made by the agent."""
    tool_name: str
    arguments: dict
    result: dict
    duration_ms: int
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass 
class AgentResult:
    """Final result of an agent mission."""
    agent_id: str
    goal: str
    success: bool
    summary: str
    tool_calls: list
    iterations: int
    duration_ms: int
    error: Optional[str] = None
    kernel_managed: bool = False


# Tool name mapping: OpenAI function name → TOOL_REGISTRY key
TOOL_NAME_MAP = {
    "security_headers_check": "check_url_security_headers",
    "cisa_kev_check": "check_cisa_kev",
    "osv_check": "search_osv",
    # These already match TOOL_REGISTRY keys directly:
    # nmap_scan, nuclei_scan, semgrep_scan, trivy_scan, nikto_scan,
    # sqlmap_scan, masscan_scan, subfinder_scan, httpx_probe (note: httpx_scan not httpx_probe),
    "httpx_scan": "httpx_probe",
    # ffuf_scan, gobuster_scan, wpscan_scan — all match directly
}

# Parameter name mapping: OpenAI tool param name → tool_gateway param name
# Some tools expect "url" instead of "target", or "domain" instead of "target"
PARAM_MAP = {
    "check_url_security_headers": {"target": "url", "target_url": "url"},
    "check_url_headers": {"target": "url", "target_url": "url"},
    "check_domain_security": {"target": "domain", "target_url": "domain"},
    "nmap_scan": {"target": "target"},  # nmap uses "target" — matches
    "nuclei_scan": {"target": "target"},  # nuclei uses "target" — matches
    "httpx_probe": {"target": "target"},
    "subfinder_scan": {"target": "domain"},
    "gobuster_scan": {"target": "url"},
    "ffuf_scan": {"target": "url"},
    "nikto_scan": {"target": "target", "target_url": "target"},
    "wpscan_scan": {"target": "url"},
    "check_cisa_kev": {},  # no params needed
    "search_osv": {"target": "package", "package_name": "package"},
}


class AgenticLoop:
    """The core reasoning engine — agents that THINK, not just execute."""
    
    MAX_ITERATIONS = 10
    MODEL = "gpt-4.1"
    
    def __init__(self, agent_id: str, model: str = None):
        self.agent_id = agent_id
        self.model = model or self.MODEL
        self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.tool_registry = TOOL_REGISTRY
        self.execute_tool_fn = execute_tool
        self.get_prompt = get_agent_prompt
        self.get_tools = get_tool_definitions
        self.get_tool_names = get_tool_names
        
        if agent_id not in AGENT_REGISTRY:
            logger.warning(f"Unknown agent: {agent_id}. Using default prompt.")
    
    async def run(self, goal: str, context: dict = None) -> AgentResult:
        """Execute the agent loop: Observe → Reason → Act → Verify → Loop."""
        start_time = time.time()
        tool_calls = []
        
        system_prompt = self.get_prompt(self.agent_id)
        context_str = json.dumps(context or {}, indent=2) if context else "None"
        
        user_message = f"""## GOAL
{goal}

## CONTEXT
{context_str}

## INSTRUCTIONS
Use your available tools to accomplish this goal. Think step by step.
Explain your reasoning before each tool call. After getting results,
analyze them and decide the next step. When done, provide a summary.
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        tools = self.get_tools(self.agent_id)
        tool_names = self.get_tool_names(self.agent_id)
        
        logger.info(f"Agent {self.agent_id} starting: {goal[:100]}")
        logger.info(f"Available tools: {tool_names}")
        
        last_error = None
        
        for iteration in range(self.MAX_ITERATIONS):
            logger.info(f"Iteration {iteration + 1}/{self.MAX_ITERATIONS}")
            
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.1,
                    max_tokens=4096,
                )
                
                msg = response.choices[0].message
                
                if msg.tool_calls:
                    messages.append({
                        "role": "assistant",
                        "content": msg.content,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            }
                            for tc in msg.tool_calls
                        ]
                    })
                    
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.function.name
                        try:
                            args = json.loads(tool_call.function.arguments)
                        except json.JSONDecodeError:
                            args = {}
                        
                        logger.info(f"  Tool: {tool_name}({json.dumps(args)[:200]})")
                        
                        tool_start = time.time()
                        try:
                            result = await self._execute_tool(tool_name, args)
                            duration_ms = int((time.time() - tool_start) * 1000)
                            
                            tool_calls.append(ToolCall(
                                tool_name=tool_name, arguments=args,
                                result=result, duration_ms=duration_ms
                            ))
                            
                            logger.info(f"  Result: {json.dumps(result)[:200]}")
                            
                            result_str = json.dumps(result) if isinstance(result, (dict, list)) else str(result)
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": result_str[:4000]
                            })
                            
                        except Exception as e:
                            duration_ms = int((time.time() - tool_start) * 1000)
                            error_result = {"error": str(e), "tool": tool_name}
                            
                            tool_calls.append(ToolCall(
                                tool_name=tool_name, arguments=args,
                                result=error_result, duration_ms=duration_ms
                            ))
                            
                            logger.error(f"  Error: {e}")
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(error_result)
                            })
                    
                    continue
                
                # No tool call → agent is done
                summary = msg.content or "No summary provided."
                total_ms = int((time.time() - start_time) * 1000)
                
                logger.info(f"Done in {iteration + 1} iterations, {total_ms}ms")
                
                return AgentResult(
                    agent_id=self.agent_id, goal=goal, success=True,
                    summary=summary, tool_calls=tool_calls,
                    iterations=iteration + 1, duration_ms=total_ms
                )
                
            except Exception as e:
                last_error = str(e)
                logger.error(f"Iteration {iteration + 1} error: {e}")
                
                if "api_key" in str(e).lower() or "authentication" in str(e).lower():
                    break
                
                messages.append({
                    "role": "system",
                    "content": f"Error: {e}. Try a different approach."
                })
                continue
        
        total_ms = int((time.time() - start_time) * 1000)
        return AgentResult(
            agent_id=self.agent_id, goal=goal, success=False,
            summary=f"Max iterations or error: {last_error}",
            tool_calls=tool_calls, iterations=self.MAX_ITERATIONS,
            duration_ms=total_ms, error=last_error
        )
    
    async def _execute_tool(self, tool_name: str, args: dict) -> dict:
        """Legacy loop cannot manufacture an authenticated broker execution context."""
        return {"success": False, "error": "Use the governed workflow executor",
                "code": "GOVERNED_CAPABILITY_REQUIRED", "execution_mode": "not_executed"}

    async def _store_finding(self, args: dict) -> dict:
        """Store a security finding through the verified service scope (Phase C).

        Fail closed: no scope, no write. The model payload can never select
        tenant/repository identity."""
        from gds_api.security_scope import (SecurityScopeError,
                                            resolve_service_scope,
                                            service_scope_configured,
                                            store_scoped_finding)
        if not service_scope_configured():
            return {"error": "Finding store requires a configured service security scope (fail closed)"}
        try:
            scope = resolve_service_scope()
            details_raw = args.get("details", {})
            if isinstance(details_raw, dict):
                description = str(details_raw.get("description", json.dumps(details_raw)))[:2000]
            else:
                description = str(details_raw)[:2000]
            return store_scoped_finding({
                "source": str(args.get("scanner", "agent")),
                "title": str(args.get("title", "Untitled")),
                "severity": str(args.get("severity", "info")),
                "target": str(args.get("target", "")),
                "description": description,
                "cve_id": str(args.get("cve_id", "")),
                "remediation": str(args.get("remediation", ""))[:2000],
            }, scope)
        except SecurityScopeError as e:
            return {"error": str(e)}

    async def _get_findings(self, args: dict) -> dict:
        """Retrieve findings through the verified service scope (Phase C).

        Fail closed: no scope, no read."""
        from gds_api.security_scope import (SecurityScopeError,
                                            read_scoped_findings,
                                            resolve_service_scope,
                                            service_scope_configured)
        if not service_scope_configured():
            return {"error": "Finding read requires a configured service security scope (fail closed)"}
        try:
            scope = resolve_service_scope()
            query = {"limit": 50}
            if args.get("target"):
                query["target"] = str(args["target"])
            severity = str(args.get("severity", "") or "").lower()
            if severity:
                query["severity"] = severity
            status = str(args.get("status", "") or "").lower()
            if status and status != "all":
                query["status"] = status
            findings = read_scoped_findings(query, scope)
            return {"findings": findings, "count": len(findings)}
        except SecurityScopeError as e:
            return {"error": str(e)}

    async def _aws_iam_scan(self, args: dict) -> dict:
        """AWS IAM scan using boto3."""
        try:
            import boto3
            AWS_KEY = os.environ.get("AWS_ACCESS_KEY_ID")
            AWS_SECRET = os.environ.get("AWS_SECRET_ACCESS_KEY")
            AWS_REGION = os.environ.get("AWS_REGION", "eu-west-2")
            
            iam = boto3.client('iam', region_name=AWS_REGION,
                              aws_access_key_id=AWS_KEY,
                              aws_secret_access_key=AWS_SECRET)
            
            check_type = args.get("check_type", "all")
            findings = []
            
            if check_type in ("users", "mfa", "all"):
                users = iam.list_users()
                for user in users['Users']:
                    username = user['UserName']
                    mfa = iam.list_mfa_devices(UserName=username)
                    if not mfa['MFADevices']:
                        findings.append({
                            "title": f"No MFA for user {username}",
                            "severity": "high",
                            "target": f"aws:iam:{username}"
                        })
            
            if check_type in ("policy", "all"):
                try:
                    iam.get_account_password_policy()
                except:
                    findings.append({
                        "title": "No IAM password policy set",
                        "severity": "high",
                        "target": "aws:iam:account"
                    })
            
            return {"findings": findings, "count": len(findings)}
        except Exception as e:
            pass  # Memory stats are non-critical
        
            return {"error": str(e)}
