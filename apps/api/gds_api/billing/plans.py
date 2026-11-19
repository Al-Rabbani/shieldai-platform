"""The price list, in one place, because the gate reads the same numbers the customer is shown.

These limits were declared here from the start and enforced nowhere. Keeping the single definition in
its own module lets gds_api.quota import them without importing the billing router (which would be a
circular import) while still guaranteeing the brochure and the enforcement cannot disagree.
"""

PLANS = [
    {
        "tier": "starter",
        "name": "Starter",
        "price_monthly": 399,
        "price_annual": 3990,
        "currency": "GBP",
        "symbol": "£",
        "description": "Perfect for small teams getting started with autonomous security",
        "features": [
            "Cloud posture scan", "Basic findings dashboard", "1 cloud account",
            "In-app notifications", "Email support", "Daily scan schedule"
        ],
        "max_cloud_accounts": 1,
        "token_quota": 50000,
    },
    {
        "tier": "professional",
        "name": "Professional",
        "price_monthly": 1199,
        "price_annual": 11990,
        "currency": "GBP",
        "symbol": "£",
        "description": "For security teams managing multiple cloud environments",
        "features": [
            "Everything in Starter", "Multi-cloud (AWS/Azure/GCP)",
            "Threat intelligence feeds", "SSH network diagnostics",
            "Email + Slack alerts", "5 cloud accounts", "Scheduled missions",
            "API access", "Priority support"
        ],
        "max_cloud_accounts": 5,
        "token_quota": 200000,
    },
    {
        "tier": "enterprise",
        "name": "Enterprise",
        "price_monthly": 3999,
        "price_annual": 39990,
        "currency": "GBP",
        "symbol": "£",
        "description": "Full autonomous security operations for large enterprises and MSSPs",
        "features": [
            "Everything in Professional", "Red team operations",
            "Purple team collaboration", "Compliance automation (SOC2/ISO27001/PCI)",
            "Enterprise SSO (SAML/OIDC)", "Dedicated support engineer",
            "Custom agent workflows", "Unlimited cloud accounts",
            "On-premise deployment option", "SLA with credits"
        ],
        "max_cloud_accounts": 999,
        "token_quota": 1000000,
    },
]
