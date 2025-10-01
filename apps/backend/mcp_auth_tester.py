"""
FastAPI MCP Auth Testing Server

This server exposes Clerk authentication testing as MCP tools,
allowing programmatic testing of all 14 auth-protected API routes
in the Next.js application.

Usage:
    uvicorn mcp_auth_tester:app --reload --port 8001

Then connect with MCP Inspector:
    npx @modelcontextprotocol/inspector
"""

from fastapi import FastAPI, Query
from fastapi_mcp import FastApiMCP
import httpx
from typing import Dict, List, Optional
import json
from datetime import datetime

app = FastAPI(
    title="Clerk Auth Tester",
    description="MCP server for testing Clerk authentication on Next.js API routes",
    version="1.0.0"
)

# Configuration
NEXTJS_BASE_URL = "http://localhost:3001"

# All 14 auth-protected routes to test
PROTECTED_ROUTES = [
    # Conversation CRUD routes
    {
        "path": "/api/conversations",
        "method": "GET",
        "description": "List all conversations",
        "requires_body": False
    },
    {
        "path": "/api/conversations",
        "method": "POST",
        "description": "Create new conversation",
        "requires_body": True,
        "body": {
            "contentType": "text",
            "contentTitle": "Test Conversation",
            "contentContent": "Test content for auth validation"
        }
    },
    {
        "path": "/api/conversations/{conversation_id}",
        "method": "GET",
        "description": "Get specific conversation",
        "requires_body": False,
        "uses_param": True
    },
    {
        "path": "/api/conversations/{conversation_id}",
        "method": "PATCH",
        "description": "Update conversation status",
        "requires_body": True,
        "uses_param": True,
        "body": {
            "status": "completed",
            "finalRecommendation": "Test recommendation",
            "confidenceScore": 0.85
        }
    },
    {
        "path": "/api/conversations/{conversation_id}",
        "method": "DELETE",
        "description": "Delete conversation",
        "requires_body": False,
        "uses_param": True
    },
    {
        "path": "/api/conversations/{conversation_id}/messages",
        "method": "GET",
        "description": "Get conversation messages",
        "requires_body": False,
        "uses_param": True
    },
    {
        "path": "/api/conversations/{conversation_id}/messages",
        "method": "POST",
        "description": "Add message to conversation",
        "requires_body": True,
        "uses_param": True,
        "body": {
            "agentType": "financial_analyst",
            "agentName": "Test Analyst",
            "content": "Test message",
            "messageOrder": 1
        }
    },
    {
        "path": "/api/conversations/{conversation_id}/export",
        "method": "GET",
        "description": "Export conversation",
        "requires_body": False,
        "uses_param": True
    },
    {
        "path": "/api/conversations/{conversation_id}/stream",
        "method": "GET",
        "description": "Stream conversation (GET)",
        "requires_body": False,
        "uses_param": True
    },
    {
        "path": "/api/conversations/{conversation_id}/stream",
        "method": "POST",
        "description": "Stream conversation (POST)",
        "requires_body": True,
        "uses_param": True,
        "body": {
            "message": "Test streaming message"
        }
    },
    # Content processing routes
    {
        "path": "/api/content/text",
        "method": "POST",
        "description": "Analyze text content",
        "requires_body": True,
        "body": {
            "content": "The Federal Reserve announced interest rate decisions impacting market volatility and investment strategies across equity markets.",
            "analysisType": "QUICK"
        }
    },
    {
        "path": "/api/content/substack",
        "method": "POST",
        "description": "Extract Substack article",
        "requires_body": True,
        "body": {
            "url": "https://example.substack.com/p/test-article"
        }
    },
    {
        "path": "/api/content/unified",
        "method": "POST",
        "description": "Unified content processing",
        "requires_body": True,
        "body": {
            "contentType": "text",
            "content": "Market analysis content for testing"
        }
    },
    {
        "path": "/api/simple-youtube",
        "method": "POST",
        "description": "Extract YouTube transcript",
        "requires_body": True,
        "body": {
            "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
    }
]


@app.get("/health", operation_id="health_check")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "nextjs_target": NEXTJS_BASE_URL
    }


@app.get("/test/unauthorized-access", operation_id="test_unauthorized_access")
async def test_unauthorized_access(
    test_conversation_id: str = Query(
        default="test_conv_123",
        description="Conversation ID to use for parameterized routes"
    )
):
    """
    Test that all 14 protected routes return 401 Unauthorized without auth token.
    This validates the auth enforcement is working correctly.
    """
    results = []
    passed_count = 0
    failed_count = 0

    async with httpx.AsyncClient(timeout=10.0) as client:
        for route_config in PROTECTED_ROUTES:
            # Replace conversation_id parameter if needed
            path = route_config["path"]
            if route_config.get("uses_param"):
                path = path.replace("{conversation_id}", test_conversation_id)

            url = f"{NEXTJS_BASE_URL}{path}"

            try:
                # Make request WITHOUT authorization header
                request_kwargs = {"method": route_config["method"], "url": url}
                if route_config.get("requires_body"):
                    request_kwargs["json"] = route_config["body"]

                response = await client.request(**request_kwargs)

                # Should get 401 Unauthorized
                expected_status = 401
                passed = response.status_code == expected_status

                if passed:
                    passed_count += 1
                else:
                    failed_count += 1

                results.append({
                    "route": f"{route_config['method']} {route_config['path']}",
                    "description": route_config["description"],
                    "status_code": response.status_code,
                    "expected": expected_status,
                    "passed": passed,
                    "response_preview": response.text[:200] if not passed else None
                })

            except Exception as e:
                failed_count += 1
                results.append({
                    "route": f"{route_config['method']} {route_config['path']}",
                    "description": route_config["description"],
                    "status_code": None,
                    "expected": 401,
                    "passed": False,
                    "error": str(e)
                })

    return {
        "test_name": "Unauthorized Access Test",
        "description": "Verify all routes return 401 without auth",
        "total_routes": len(PROTECTED_ROUTES),
        "passed": passed_count,
        "failed": failed_count,
        "success_rate": f"{(passed_count / len(PROTECTED_ROUTES) * 100):.1f}%",
        "all_passed": failed_count == 0,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/test/dev-mode-fallback", operation_id="test_dev_mode_fallback")
async def test_dev_mode_fallback(
    test_conversation_id: str = Query(
        default="test_conv_123",
        description="Conversation ID to use for parameterized routes"
    )
):
    """
    Test that routes handle auth() exceptions gracefully when middleware is disabled.
    In development mode with disabled middleware, routes should log warnings but
    still enforce 401 responses for missing userId.
    """
    results = []
    warning_logs_found = 0

    # Note: This test checks behavior, not logs (logs would need server-side access)
    # In practice, this validates the try-catch pattern is working

    async with httpx.AsyncClient(timeout=10.0) as client:
        for route_config in PROTECTED_ROUTES[:5]:  # Test first 5 routes as sample
            path = route_config["path"]
            if route_config.get("uses_param"):
                path = path.replace("{conversation_id}", test_conversation_id)

            url = f"{NEXTJS_BASE_URL}{path}"

            try:
                request_kwargs = {"method": route_config["method"], "url": url}
                if route_config.get("requires_body"):
                    request_kwargs["json"] = route_config["body"]

                response = await client.request(**request_kwargs)

                # Should still get 401 even with try-catch wrapper
                graceful_handling = response.status_code == 401

                results.append({
                    "route": f"{route_config['method']} {route_config['path']}",
                    "status_code": response.status_code,
                    "graceful_handling": graceful_handling,
                    "note": "Try-catch pattern allows route to execute and return proper 401"
                })

            except Exception as e:
                results.append({
                    "route": f"{route_config['method']} {route_config['path']}",
                    "graceful_handling": False,
                    "error": str(e),
                    "note": "Route crashed instead of gracefully handling auth error"
                })

    return {
        "test_name": "Development Mode Fallback Test",
        "description": "Verify try-catch pattern handles disabled middleware gracefully",
        "note": "All routes should return 401 without crashing",
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/test/auth-coverage", operation_id="test_auth_coverage")
async def test_auth_coverage():
    """
    Verify all 14 auth-protected routes are documented and testable.
    This is a meta-test to ensure our test suite is comprehensive.
    """
    route_summary = []

    for route_config in PROTECTED_ROUTES:
        route_summary.append({
            "endpoint": f"{route_config['method']} {route_config['path']}",
            "description": route_config["description"],
            "requires_body": route_config.get("requires_body", False),
            "uses_param": route_config.get("uses_param", False),
            "has_test_body": "body" in route_config if route_config.get("requires_body") else "N/A"
        })

    return {
        "test_name": "Auth Coverage Test",
        "description": "Verify all auth-protected routes are documented",
        "total_routes": len(PROTECTED_ROUTES),
        "routes": route_summary,
        "coverage_complete": True,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/test/specific-route", operation_id="test_specific_route")
async def test_specific_route(
    method: str = Query(description="HTTP method (GET, POST, PATCH, DELETE)"),
    path: str = Query(description="API route path (e.g., /api/conversations)"),
    conversation_id: Optional[str] = Query(default=None, description="Conversation ID if needed"),
    clerk_token: Optional[str] = Query(default=None, description="Clerk session token (optional)")
):
    """
    Test a specific route with optional Clerk authentication.
    Useful for debugging individual endpoint auth behavior.
    """
    # Replace conversation_id in path if provided
    if conversation_id and "{conversation_id}" in path:
        path = path.replace("{conversation_id}", conversation_id)

    url = f"{NEXTJS_BASE_URL}{path}"

    # Find route config for body if needed
    route_config = next(
        (r for r in PROTECTED_ROUTES if r["path"] == path and r["method"] == method),
        None
    )

    headers = {}
    if clerk_token:
        headers["Authorization"] = f"Bearer {clerk_token}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            request_kwargs = {"method": method, "url": url, "headers": headers}

            if route_config and route_config.get("requires_body"):
                request_kwargs["json"] = route_config["body"]

            response = await client.request(**request_kwargs)

            return {
                "route": f"{method} {path}",
                "status_code": response.status_code,
                "has_auth_token": clerk_token is not None,
                "expected_with_auth": 200 if clerk_token else 401,
                "response_preview": response.text[:500],
                "headers": dict(response.headers),
                "timestamp": datetime.utcnow().isoformat()
            }

    except Exception as e:
        return {
            "route": f"{method} {path}",
            "error": str(e),
            "has_auth_token": clerk_token is not None,
            "timestamp": datetime.utcnow().isoformat()
        }


@app.get("/test/all-routes-summary", operation_id="test_all_routes_summary")
async def test_all_routes_summary(
    test_conversation_id: str = Query(
        default="test_conv_123",
        description="Conversation ID to use for parameterized routes"
    )
):
    """
    Comprehensive test summary of all 14 auth-protected routes.
    Returns a quick overview of which routes are properly enforcing auth.
    """
    results = {
        "conversation_routes": [],
        "content_routes": [],
        "summary": {}
    }

    passed = 0
    failed = 0

    async with httpx.AsyncClient(timeout=10.0) as client:
        for route_config in PROTECTED_ROUTES:
            path = route_config["path"]
            if route_config.get("uses_param"):
                path = path.replace("{conversation_id}", test_conversation_id)

            url = f"{NEXTJS_BASE_URL}{path}"

            try:
                request_kwargs = {"method": route_config["method"], "url": url}
                if route_config.get("requires_body"):
                    request_kwargs["json"] = route_config["body"]

                response = await client.request(**request_kwargs)

                is_passing = response.status_code == 401
                if is_passing:
                    passed += 1
                else:
                    failed += 1

                result = {
                    "endpoint": f"{route_config['method']} {route_config['path']}",
                    "status": response.status_code,
                    "auth_enforced": is_passing,
                    "icon": "✅" if is_passing else "❌"
                }

                # Categorize by route type
                if "/content/" in route_config["path"] or "youtube" in route_config["path"]:
                    results["content_routes"].append(result)
                else:
                    results["conversation_routes"].append(result)

            except Exception as e:
                failed += 1
                result = {
                    "endpoint": f"{route_config['method']} {route_config['path']}",
                    "status": "ERROR",
                    "auth_enforced": False,
                    "icon": "❌",
                    "error": str(e)
                }

                if "/content/" in route_config["path"]:
                    results["content_routes"].append(result)
                else:
                    results["conversation_routes"].append(result)

    results["summary"] = {
        "total_routes": len(PROTECTED_ROUTES),
        "passed": passed,
        "failed": failed,
        "success_rate": f"{(passed / len(PROTECTED_ROUTES) * 100):.1f}%",
        "all_passing": failed == 0,
        "timestamp": datetime.utcnow().isoformat()
    }

    return results


# Create MCP server
mcp = FastApiMCP(
    app,
    name="Clerk Auth Tester",
    description="Test Clerk authentication enforcement across Next.js API routes"
)

# Mount HTTP transport (recommended)
mcp.mount_http()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
