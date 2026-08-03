#!/usr/bin/env python3
"""
GDS Kernel Phase 6 — Multi-Agent Mission Orchestration

When a user gives a high-level goal like "run a full security assessment",
the orchestrator:
1. Uses GPT-4.1 to plan which agents to invoke and in what order
2. Creates kernel APCBs for each agent
3. Runs agents in parallel (asyncio.gather) when no dependencies
4. Shares findings between agents through kernel IPC (shared context window)
5. Aggregates all results into a unified security report

Architecture:
  Mission Orchestrator
  ├── GPT-4.1 Planner (decides agent selection + execution order)
  ├── Parallel Agent Runner (asyncio.gather for independent agents)
  ├── Sequential Agent Runner (for dependent agents)
  ├── Shared Context Pool (kernel memory namespace for cross-agent findings)
  └── Result Aggregator (GPT-4.1 synthesizes all agent outputs into report)
"""
import sys
import os
import logging
import time
import uuid
import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("gds.kernel.mission")

# Import kernel
KERNEL_AVAILABLE = False
MemorySegmentType = None
try:
    from gds_kernel.kernel_router import get_kernel
    from gds_kernel.memory import MemorySegmentType as _MST
    MemorySegmentType = _MST
    KERNEL_AVAILABLE = True
except Exception as e:
    logger.warning("Kernel not available: %s" % e)

# Import agent runner
try:
    from gds_api.reasoning.kernel_agent_runner import run_kernel_agent_runner
    AGENT_RUNNER_AVAILABLE = True
except Exception as e:
    logger.warning("Agent runner not available: %s" % e)
    AGENT_RUNNER_AVAILABLE = False

# Agent catalog — maps agent IDs to their capabilities
AGENT_CATALOG = {
    "ai-vuln-director": {
        "tools": ["nmap_scan", "cisa_kev_check", "osv_check", "security_headers_check"],
        "specialty": "Vulnerability scanning, CVE analysis, CISA KEV tracking",
        "use_when": "Scanning for vulnerabilities, checking CVEs, security headers"
    },
    "ai-cloud-director": {
        "tools": ["aws_iam_scan"],
        "specialty": "Cloud security, IAM analysis, CIEM, privilege escalation",
        "use_when": "AWS cloud scanning, IAM audit, privilege analysis"
    },
    "ai-threat-hunter": {
        "tools": ["nmap_scan", "nuclei_scan", "security_headers_check"],
        "specialty": "Threat hunting, attack surface mapping, active reconnaissance",
        "use_when": "Hunting for threats, attack surface analysis, reconnaissance"
    },
    "ai-incident-commander": {
        "tools": ["get_findings", "store_finding"],
        "specialty": "Incident response, finding triage, evidence collection",
        "use_when": "Investigating incidents, triaging findings, evidence collection"
    },
    "ai-remediation-director": {
        "tools": ["get_findings", "store_finding"],
        "specialty": "Remediation planning, patch prioritization, fix tracking",
        "use_when": "Planning remediation, prioritizing patches, tracking fixes"
    },
    "ai-soc-director": {
        "tools": ["get_findings", "cisa_kev_check"],
        "specialty": "SOC operations, alert triage, security monitoring",
        "use_when": "SOC summary, alert triage, security monitoring overview"
    },
    "ai-compliance-director": {
        "tools": ["get_findings"],
        "specialty": "Compliance assessment, audit preparation, framework mapping",
        "use_when": "Compliance checking, audit prep, framework mapping"
    },
    "ai-chief-ciso": {
        "tools": ["get_findings"],
        "specialty": "Executive risk assessment, board reporting, strategic decisions",
        "use_when": "Executive summary, board report, risk assessment"
    },
}


async def plan_mission(goal: str, model: str = "gpt-4.1") -> Dict[str, Any]:
    """
    Use GPT-4.1 to analyze a high-level goal and plan which agents to invoke.
    
    Returns:
    {
        "agents": ["ai-vuln-director", "ai-cloud-director", ...],
        "parallel": true/false,  # Can agents run in parallel?
        "steps": [
            {"agent": "ai-vuln-director", "goal": "Run nmap + CISA KEV check"},
            {"agent": "ai-cloud-director", "goal": "Scan AWS IAM for misconfigurations"},
            ...
        ],
        "aggregator": "ai-chief-ciso"  # Agent to synthesize final report
    }
    """
    agent_descriptions = "\n".join([
        "- %s: %s (Use when: %s)" % (aid, info["specialty"], info["use_when"])
        for aid, info in AGENT_CATALOG.items()
    ])
    
    planning_prompt = """You are the GDS OS Mission Planner. Given a security goal, decide which AI agents to invoke and in what order.

Available agents:
%s

Rules:
1. Select 1-5 agents that are most relevant to the goal
2. If agents are independent (no dependencies), they run in parallel
3. If one agent's output is needed by another, mark them as sequential
4. Assign a specific sub-goal to each agent
5. Choose an aggregator agent to synthesize the final report

Respond with JSON only, no markdown:
{
  "agents": ["agent_id1", "agent_id2"],
  "parallel": true,
  "steps": [
    {"agent": "agent_id", "goal": "specific sub-goal for this agent"},
  ],
  "aggregator": "agent_id for final synthesis",
  "rationale": "brief explanation of why these agents"
}""" % agent_descriptions
    
    try:
        import openai
        from dotenv import load_dotenv
        load_dotenv("/opt/.env")
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": planning_prompt},
                {"role": "user", "content": "Goal: %s" % goal}
            ],
            temperature=0.1,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        plan = json.loads(response.choices[0].message.content)
        logger.info("Mission plan: %d agents, parallel=%s" % (
            len(plan.get("agents", [])), plan.get("parallel", False)
        ))
        return plan
        
    except Exception as e:
        logger.error("Mission planning failed: %s" % e)
        # Fallback: auto-select based on keywords
        return _fallback_plan(goal)


def _fallback_plan(goal: str) -> Dict[str, Any]:
    """Simple keyword-based agent selection when GPT-4.1 planning fails."""
    goal_lower = goal.lower()
    agents = []
    steps = []
    
    if any(kw in goal_lower for kw in ["vuln", "cve", "scan", "kev", "nmap", "headers"]):
        agents.append("ai-vuln-director")
        steps.append({"agent": "ai-vuln-director", "goal": "Run vulnerability scans: nmap, CISA KEV check, security headers"})
    
    if any(kw in goal_lower for kw in ["cloud", "aws", "iam", "privilege"]):
        agents.append("ai-cloud-director")
        steps.append({"agent": "ai-cloud-director", "goal": "Scan AWS IAM for misconfigurations and privilege escalation"})
    
    if any(kw in goal_lower for kw in ["threat", "hunt", "recon", "attack surface"]):
        agents.append("ai-threat-hunter")
        steps.append({"agent": "ai-threat-hunter", "goal": "Hunt for threats: nmap, nuclei, security headers"})
    
    if any(kw in goal_lower for kw in ["incident", "investigate", "triage"]):
        agents.append("ai-incident-commander")
        steps.append({"agent": "ai-incident-commander", "goal": "Review and triage all security findings"})
    
    if any(kw in goal_lower for kw in ["compliance", "audit", "soc2", "pci", "iso"]):
        agents.append("ai-compliance-director")
        steps.append({"agent": "ai-compliance-director", "goal": "Assess compliance status against frameworks"})
    
    if any(kw in goal_lower for kw in ["executive", "board", "report", "summary", "risk score"]):
        agents.append("ai-chief-ciso")
        steps.append({"agent": "ai-chief-ciso", "goal": "Provide executive risk assessment"})
    
    # If nothing matched, default to vuln director + threat hunter
    if not agents:
        agents = ["ai-vuln-director", "ai-threat-hunter"]
        steps = [
            {"agent": "ai-vuln-director", "goal": "Run nmap scan, CISA KEV check, and security headers check"},
            {"agent": "ai-threat-hunter", "goal": "Run nmap and nuclei scan for threats and attack surface"}
        ]
    
    return {
        "agents": agents,
        "parallel": True,
        "steps": steps,
        "aggregator": "ai-chief-ciso",
        "rationale": "Fallback keyword-based selection"
    }


async def execute_mission(
    goal: str,
    context: Optional[Dict[str, Any]] = None,
    model: str = "gpt-4.1",
    max_agents_parallel: int = 5,
) -> Dict[str, Any]:
    """
    Execute a multi-agent mission:
    1. Plan which agents to invoke
    2. Run agents (parallel or sequential)
    3. Aggregate results into unified report
    
    Returns:
    {
        "mission_id": "...",
        "goal": "...",
        "plan": {...},
        "agent_results": [...],
        "unified_report": "...",
        "duration_ms": ...,
        "kernel_managed": true,
        "total_tool_calls": N,
        "total_findings": N
    }
    """
    start_time = time.time()
    mission_id = "mission-%s" % uuid.uuid4().hex[:12]
    context = context or {}
    
    logger.info("Mission %s started: %s" % (mission_id, goal[:100]))
    
    # Step 1: Plan the mission
    plan = await plan_mission(goal, model)
    
    # Step 2: Allocate shared mission context in kernel memory
    mission_pid = "mission-%s" % mission_id
    if KERNEL_AVAILABLE:
        try:
            kernel = get_kernel()
            mem = getattr(kernel, 'memory')
            mem.allocate(
                process_id=mission_pid,
                content="Mission: %s" % goal,
                segment_type=MemorySegmentType.SYSTEM_PROMPT,
                importance=1.0
            )
            mem.allocate(
                process_id=mission_pid,
                content="Plan: %s" % json.dumps(plan),
                segment_type=MemorySegmentType.WORKING,
                importance=0.8
            )
            logger.info("Mission context allocated: %s" % mission_pid)
        except Exception as e:
            logger.warning("Mission context alloc failed: %s" % e)
    
    # Step 3: Execute agent steps
    agent_results = []
    steps = plan.get("steps", [])
    parallel = plan.get("parallel", False)
    
    if parallel and len(steps) > 1 and AGENT_RUNNER_AVAILABLE:
        # Run agents in parallel
        logger.info("Running %d agents in parallel" % len(steps))
        
        tasks = []
        for step in steps[:max_agents_parallel]:
            agent_id = step.get("agent", "")
            agent_goal = step.get("goal", goal)
            
            # Add mission context to each agent
            agent_context = dict(context)
            agent_context["mission_id"] = mission_id
            agent_context["mission_goal"] = goal
            
            task = run_kernel_agent_runner(
                agent_id=agent_id,
                goal=agent_goal,
                context=agent_context,
                model=model,
                max_iterations=5
            )
            tasks.append(task)
        
        # Gather all results
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                agent_results.append({
                    "agent_id": steps[i].get("agent", "unknown"),
                    "success": False,
                    "error": str(result),
                    "tool_calls": [],
                    "summary": "Agent failed: %s" % result
                })
            else:
                agent_results.append(result)
    
    elif AGENT_RUNNER_AVAILABLE:
        # Run agents sequentially
        logger.info("Running %d agents sequentially" % len(steps))
        
        for step in steps:
            agent_id = step.get("agent", "")
            agent_goal = step.get("goal", goal)
            
            agent_context = dict(context)
            agent_context["mission_id"] = mission_id
            agent_context["mission_goal"] = goal
            
            # Add previous agent findings as context
            if agent_results:
                prev_findings = []
                for ar in agent_results:
                    if ar.get("success") and ar.get("summary"):
                        prev_findings.append("%s: %s" % (
                            ar.get("agent_id", "?"),
                            str(ar.get("summary", ""))[:200]
                        ))
                if prev_findings:
                    agent_context["previous_findings"] = "\n".join(prev_findings[:3])
            
            result = await run_kernel_agent_runner(
                agent_id=agent_id,
                goal=agent_goal,
                context=agent_context,
                model=model,
                max_iterations=5
            )
            agent_results.append(result)
            
            # Store each agent result in mission memory
            if KERNEL_AVAILABLE:
                try:
                    kernel = get_kernel()
                    mem = getattr(kernel, 'memory')
                    mem.allocate(
                        process_id=mission_pid,
                        content="Agent %s result: %s" % (
                            agent_id, str(result.get("summary", ""))[:2000]
                        ),
                        segment_type=MemorySegmentType.TOOL_RESULT,
                        importance=0.6
                    )
                except Exception as e:
                    logger.debug("Mission memory store failed: %s" % e)
    
    # Step 4: Aggregate results into unified report
    unified_report = await _aggregate_results(
        goal, agent_results, plan.get("aggregator", "ai-chief-ciso"), model
    )
    
    # Step 5: Store final report in mission memory
    if KERNEL_AVAILABLE:
        try:
            kernel = get_kernel()
            mem = getattr(kernel, 'memory')
            mem.allocate(
                process_id=mission_pid,
                content="Unified Report: %s" % unified_report[:2000],
                segment_type=MemorySegmentType.SUMMARY,
                importance=0.9
            )
        except Exception as e:
            logger.debug("Mission report storage failed: %s" % e)
    
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Calculate totals
    total_tool_calls = sum(len(ar.get("tool_calls", [])) for ar in agent_results)
    successful_agents = sum(1 for ar in agent_results if ar.get("success"))
    
    logger.info("Mission %s complete: %d agents, %d tool calls, %dms" % (
        mission_id, successful_agents, total_tool_calls, duration_ms
    ))
    
    return {
        "mission_id": mission_id,
        "goal": goal,
        "plan": plan,
        "agent_results": [
            {
                "agent_id": ar.get("agent_id", "?"),
                "success": ar.get("success", False),
                "pid": ar.get("pid", "?"),
                "kernel_managed": ar.get("kernel_managed", False),
                "iterations": ar.get("iterations", 0),
                "tool_calls": len(ar.get("tool_calls", [])),
                "duration_ms": ar.get("duration_ms", 0),
                "summary": str(ar.get("summary", ""))[:500],
                "error": ar.get("error")
            }
            for ar in agent_results
        ],
        "unified_report": unified_report,
        "duration_ms": duration_ms,
        "kernel_managed": KERNEL_AVAILABLE,
        "mission_pid": mission_pid,
        "total_tool_calls": total_tool_calls,
        "successful_agents": successful_agents,
        "total_agents": len(agent_results),
    }


async def _aggregate_results(
    goal: str,
    agent_results: List[Dict[str, Any]],
    aggregator_agent: str,
    model: str = "gpt-4.1"
) -> str:
    """Use GPT-4.1 to synthesize all agent results into a unified report."""
    
    # Build context from all agent results
    agent_summaries = []
    for ar in agent_results:
        agent_id = ar.get("agent_id", "?")
        summary = ar.get("summary", "No summary")
        tool_count = len(ar.get("tool_calls", []))
        success = ar.get("success", False)
        status = "SUCCESS" if success else "FAILED"
        agent_summaries.append(
            "Agent: %s [%s]\nTools used: %d\nSummary: %s" % (
                agent_id, status, tool_count, str(summary)[:500]
            )
        )
    
    context_text = "\n\n---\n\n".join(agent_summaries)
    
    synthesis_prompt = """You are the GDS OS Mission Aggregator. Multiple AI security agents have completed their tasks for a mission. Synthesize their findings into a unified security report.

MISSION GOAL: %s

AGENT RESULTS:
%s

Create a concise but comprehensive security report:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points with severity)
3. Risk Assessment (overall risk level + trending)
4. Recommended Actions (prioritized list)

Format as clean text, no markdown headers.""" % (goal, context_text)
    
    try:
        import openai
        from dotenv import load_dotenv
        load_dotenv("/opt/.env")
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": synthesis_prompt},
                {"role": "user", "content": "Generate the unified security report now."}
            ],
            temperature=0.2,
            max_tokens=2000
        )
        
        return response.choices[0].message.content or "No report generated"
        
    except Exception as e:
        logger.error("Aggregation failed: %s" % e)
        # Fallback: simple concatenation
        return "Mission Report (Fallback Aggregation)\n\n" + "\n\n".join(agent_summaries)


# Convenience function for bridge
async def run_mission(goal: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Entry point for mission execution — called by the bridge."""
    return await execute_mission(goal, context)
