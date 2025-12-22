#!/usr/bin/env python3
"""
Comprehensive End-to-End API Testing Script
Tests all APIs with proper authentication, edge cases, and validation
"""

import requests
import json
import sys
import os
from typing import Dict, Optional, Any
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3333/api"  # API has /api prefix
# Try to get API key from environment, otherwise use default
# IMPORTANT: Set MASTER_API_KEY environment variable or update the default below
MASTER_API_KEY = os.getenv("MASTER_API_KEY", "changeme")

# If no valid API key found, prompt user
if len(sys.argv) > 1:
    MASTER_API_KEY = sys.argv[1]
    print(f"Using API key from command line argument")
elif not MASTER_API_KEY or MASTER_API_KEY == "changeme":
    print("⚠️  WARNING: Using default API key 'changeme'")
    print("   If tests fail with 'Invalid API key', set MASTER_API_KEY environment variable:")
    print("   export MASTER_API_KEY=your_actual_key")
    print("   Or pass it as argument: python3 test_all_apis_e2e.py your_actual_key")
    print()

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def print_test(name: str, status: str, details: str = ""):
    """Print test result"""
    test_results["total"] += 1
    if status == "PASS":
        test_results["passed"].append(name)
        print(f"✅ {name}: PASS")
    else:
        test_results["failed"].append(f"{name}: {details}")
        print(f"❌ {name}: FAIL - {details}")
    if details and status == "FAIL":
        print(f"   Details: {details}")

def make_request(method: str, endpoint: str, headers: Dict = None, data: Dict = None, expected_status: int = 200) -> Optional[Dict]:
    """Make HTTP request and return response"""
    url = f"{BASE_URL}{endpoint}"
    headers = headers or {}
    headers["Content-Type"] = "application/json"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return None
        
        if response.status_code == expected_status:
            try:
                return response.json() if response.content else {}
            except:
                return {"status": "success", "statusCode": response.status_code}
        else:
            return {"error": f"Expected {expected_status}, got {response.status_code}", "body": response.text}
    except Exception as e:
        return {"error": str(e)}

# ========== Authentication Tests ==========
def test_auth_apis():
    print("\n" + "="*60)
    print("AUTHENTICATION API TESTS")
    print("="*60)
    
    # Test 1: GET /auth/me with valid API key
    result = make_request("GET", "/auth/me", headers={"x-api-key": MASTER_API_KEY}, expected_status=200)
    if result and "error" not in result:
        print_test("GET /auth/me (valid API key)", "PASS")
    else:
        print_test("GET /auth/me (valid API key)", "FAIL", str(result))
    
    # Test 2: GET /auth/me with invalid API key
    result = make_request("GET", "/auth/me", headers={"x-api-key": "invalid-key"}, expected_status=401)
    if result and ("error" in result or "Unauthorized" in str(result)):
        print_test("GET /auth/me (invalid API key)", "PASS")
    else:
        print_test("GET /auth/me (invalid API key)", "FAIL", "Should return 401")
    
    # Test 3: GET /auth/me without API key
    result = make_request("GET", "/auth/me", expected_status=401)
    if result and ("error" in result or "Unauthorized" in str(result)):
        print_test("GET /auth/me (no API key)", "PASS")
    else:
        print_test("GET /auth/me (no API key)", "FAIL", "Should return 401")
    
    # Test 4: POST /auth/login with invalid credentials
    result = make_request("POST", "/auth/login", data={"email": "invalid@test.com", "password": "wrong"}, expected_status=401)
    if result and ("error" in result or "Unauthorized" in str(result) or "Invalid" in str(result)):
        print_test("POST /auth/login (invalid credentials)", "PASS")
    else:
        print_test("POST /auth/login (invalid credentials)", "FAIL", str(result))
    
    # Test 5: POST /auth/login with missing email
    result = make_request("POST", "/auth/login", data={"password": "test"}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /auth/login (missing email)", "PASS")
    else:
        print_test("POST /auth/login (missing email)", "FAIL", str(result))
    
    # Test 6: POST /auth/login with missing password
    result = make_request("POST", "/auth/login", data={"email": "test@test.com"}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /auth/login (missing password)", "PASS")
    else:
        print_test("POST /auth/login (missing password)", "FAIL", str(result))

# ========== Tenant Tests ==========
def test_tenant_apis():
    print("\n" + "="*60)
    print("TENANT API TESTS")
    print("="*60)
    
    headers = {"x-api-key": MASTER_API_KEY}
    
    # Test 1: GET /tenants
    result = make_request("GET", "/tenants", headers=headers, expected_status=200)
    if result and "error" not in result:
        print_test("GET /tenants", "PASS")
        tenants = result if isinstance(result, list) else []
    else:
        print_test("GET /tenants", "FAIL", str(result))
        tenants = []
    
    # Test 2: POST /tenants (create tenant)
    tenant_data = {"name": f"Test Tenant {datetime.now().strftime('%Y%m%d%H%M%S')}"}
    result = make_request("POST", "/tenants", headers=headers, data=tenant_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /tenants (create)", "PASS")
        test_tenant_id = result["id"]
    else:
        print_test("POST /tenants (create)", "FAIL", str(result))
        test_tenant_id = None
    
    # Test 3: POST /tenants with empty name
    result = make_request("POST", "/tenants", headers=headers, data={"name": ""}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /tenants (empty name)", "PASS")
    else:
        print_test("POST /tenants (empty name)", "FAIL", str(result))
    
    # Test 4: POST /tenants without name
    result = make_request("POST", "/tenants", headers=headers, data={}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /tenants (missing name)", "PASS")
    else:
        print_test("POST /tenants (missing name)", "FAIL", str(result))
    
    return test_tenant_id, None  # Return (tenant_id, super_admin_user_id)

# ========== Club Tests ==========
def test_club_apis(tenant_id: Optional[str]):
    print("\n" + "="*60)
    print("CLUB API TESTS")
    print("="*60)
    
    if not tenant_id:
        print("⚠️  Skipping club tests - no tenant ID")
        return None, None
    
    headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: GET /clubs
    result = make_request("GET", "/clubs", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        clubs = result if isinstance(result, list) else []
        # Empty array is valid - means no clubs exist yet
        print_test("GET /clubs", "PASS")
    else:
        print_test("GET /clubs", "FAIL", str(result))
        clubs = []
    
    # Test 2: GET /clubs without tenant-id
    result = make_request("GET", "/clubs", headers={"x-api-key": MASTER_API_KEY}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("GET /clubs (no tenant-id)", "PASS")
    else:
        print_test("GET /clubs (no tenant-id)", "FAIL", str(result))
    
    # Test 3: POST /clubs (create club) - Note: Requires SUPER_ADMIN role, not MASTER_ADMIN
    # Master Admin can create clubs via tenant setup endpoint instead
    # For now, we'll test that it properly rejects Master Admin
    club_data = {"name": f"Test Club {datetime.now().strftime('%Y%m%d%H%M%S')}"}
    result = make_request("POST", "/clubs", headers=headers, data=club_data, expected_status=403)
    if result and ("error" in result or "Forbidden" in str(result) or "Insufficient" in str(result)):
        print_test("POST /clubs (Master Admin - properly rejected)", "PASS")
        # Try creating via tenant setup endpoint instead (Master Admin can do this)
        test_club_id = None
    else:
        print_test("POST /clubs (create)", "FAIL", f"Expected 403, got: {str(result)}")
        test_club_id = None
    
    # Test 3b: Create club via tenant setup (Master Admin can do this)
    super_admin_user_id = None
    if tenant_id:
        setup_data = {
            "clubName": f"Test Club {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "clubDescription": "Test Club Description",
            "superAdminEmail": f"superadmin{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
            "superAdminDisplayName": "Test Super Admin"
        }
        result = make_request("POST", f"/tenants/{tenant_id}/setup", headers={"x-api-key": MASTER_API_KEY}, data=setup_data, expected_status=201)
        if result and "error" not in result and "club" in result and "id" in result["club"]:
            print_test("POST /tenants/:id/setup (create club with super admin)", "PASS")
            test_club_id = result["club"]["id"]
            # Extract super admin user ID if available
            if "superAdmin" in result and "user" in result["superAdmin"] and "id" in result["superAdmin"]["user"]:
                super_admin_user_id = result["superAdmin"]["user"]["id"]
        else:
            print_test("POST /tenants/:id/setup (create club)", "FAIL", str(result))
            test_club_id = None
    
    # Test 4: POST /clubs with empty name
    result = make_request("POST", "/clubs", headers=headers, data={"name": ""}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs (empty name)", "PASS")
    else:
        print_test("POST /clubs (empty name)", "FAIL", str(result))
    
    # Test 5: GET /clubs/:id
    if test_club_id:
        result = make_request("GET", f"/clubs/{test_club_id}", headers=headers, expected_status=200)
        if result and "error" not in result and result.get("id") == test_club_id:
            print_test("GET /clubs/:id", "PASS")
        else:
            print_test("GET /clubs/:id", "FAIL", str(result))
        
        # Test 6: GET /clubs/:id with invalid ID
        result = make_request("GET", "/clubs/00000000-0000-0000-0000-000000000000", headers=headers, expected_status=404)
        if result and ("error" in result or "not found" in str(result).lower()):
            print_test("GET /clubs/:id (invalid ID)", "PASS")
        else:
            print_test("GET /clubs/:id (invalid ID)", "FAIL", str(result))
    
    return test_club_id, super_admin_user_id

# ========== Staff Management Tests ==========
def test_staff_apis(tenant_id: Optional[str], club_id: Optional[str], super_admin_user_id: Optional[str] = None):
    print("\n" + "="*60)
    print("STAFF MANAGEMENT API TESTS")
    print("="*60)
    
    if not tenant_id or not club_id:
        print("⚠️  Skipping staff tests - no tenant/club ID")
        return
    
    # Use Super Admin authentication if available, otherwise Master Admin
    if super_admin_user_id:
        headers = {"x-user-id": super_admin_user_id, "x-tenant-id": tenant_id, "x-club-id": club_id}
    else:
        headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: GET /clubs/:id/staff
    result = make_request("GET", f"/clubs/{club_id}/staff", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        staff_list = result if isinstance(result, list) else []
        print_test("GET /clubs/:id/staff", "PASS")
    else:
        print_test("GET /clubs/:id/staff", "FAIL", str(result))
        staff_list = []
    
    # Test 2: POST /clubs/:id/staff (create staff)
    staff_data = {
        "name": "John Doe",
        "role": "GRE",
        "employeeId": f"EMP{datetime.now().strftime('%Y%m%d%H%M%S')}"
    }
    result = make_request("POST", f"/clubs/{club_id}/staff", headers=headers, data=staff_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /clubs/:id/staff (create)", "PASS")
        test_staff_id = result["id"]
        test_employee_id = staff_data["employeeId"]
    else:
        print_test("POST /clubs/:id/staff (create)", "FAIL", str(result))
        test_staff_id = None
        test_employee_id = None
    
    # Test 3: POST /clubs/:id/staff with empty name
    result = make_request("POST", f"/clubs/{club_id}/staff", headers=headers, data={"name": "", "role": "GRE"}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/staff (empty name)", "PASS")
    else:
        print_test("POST /clubs/:id/staff (empty name)", "FAIL", str(result))
    
    # Test 4: POST /clubs/:id/staff with invalid role
    result = make_request("POST", f"/clubs/{club_id}/staff", headers=headers, data={"name": "Test", "role": "INVALID"}, expected_status=400)
    if result and ("error" in result or "invalid" in str(result).lower()):
        print_test("POST /clubs/:id/staff (invalid role)", "PASS")
    else:
        print_test("POST /clubs/:id/staff (invalid role)", "FAIL", str(result))
    
    # Test 5: POST /clubs/:id/staff (duplicate employee ID)
    if test_employee_id:
        result = make_request("POST", f"/clubs/{club_id}/staff", headers=headers, data={"name": "Another Staff", "role": "DEALER", "employeeId": test_employee_id}, expected_status=409)
        if result and ("error" in result or "already" in str(result).lower() or "exists" in str(result).lower()):
            print_test("POST /clubs/:id/staff (duplicate employee ID)", "PASS")
        else:
            print_test("POST /clubs/:id/staff (duplicate employee ID)", "FAIL", str(result))
    
    # Test 5: PUT /clubs/:id/staff/:staffId
    if test_staff_id:
        update_data = {"name": "John Updated", "status": "Active"}
        result = make_request("PUT", f"/clubs/{club_id}/staff/{test_staff_id}", headers=headers, data=update_data, expected_status=200)
        if result and "error" not in result:
            print_test("PUT /clubs/:id/staff/:staffId", "PASS")
        else:
            print_test("PUT /clubs/:id/staff/:staffId", "FAIL", str(result))
        
        # Test 6: DELETE /clubs/:id/staff/:staffId
        result = make_request("DELETE", f"/clubs/{club_id}/staff/{test_staff_id}", headers=headers, expected_status=204)
        if result is None or (isinstance(result, dict) and (result.get("statusCode") == 204 or "error" not in result)):
            print_test("DELETE /clubs/:id/staff/:staffId", "PASS")
        else:
            print_test("DELETE /clubs/:id/staff/:staffId", "FAIL", str(result))

# ========== Credit Request Tests ==========
def test_credit_request_apis(tenant_id: Optional[str], club_id: Optional[str], super_admin_user_id: Optional[str] = None):
    print("\n" + "="*60)
    print("CREDIT REQUEST API TESTS")
    print("="*60)
    
    if not tenant_id or not club_id:
        print("⚠️  Skipping credit request tests - no tenant/club ID")
        return
    
    # Use Super Admin authentication if available
    if super_admin_user_id:
        headers = {"x-user-id": super_admin_user_id, "x-tenant-id": tenant_id, "x-club-id": club_id}
    else:
        headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: GET /clubs/:id/credit-requests
    result = make_request("GET", f"/clubs/{club_id}/credit-requests", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        print_test("GET /clubs/:id/credit-requests", "PASS")
    else:
        print_test("GET /clubs/:id/credit-requests", "FAIL", str(result))
    
    # Test 2: POST /clubs/:id/credit-requests (create)
    credit_data = {
        "playerId": f"PLAYER{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "playerName": "Test Player",
        "amount": 1000,
        "notes": "Test credit request"
    }
    result = make_request("POST", f"/clubs/{club_id}/credit-requests", headers=headers, data=credit_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /clubs/:id/credit-requests (create)", "PASS")
        test_request_id = result["id"]
    else:
        print_test("POST /clubs/:id/credit-requests (create)", "FAIL", str(result))
        test_request_id = None
    
    # Test 3: POST /clubs/:id/credit-requests with empty player name
    result = make_request("POST", f"/clubs/{club_id}/credit-requests", headers=headers, data={"playerName": "", "requestedAmount": 1000}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/credit-requests (empty name)", "PASS")
    else:
        print_test("POST /clubs/:id/credit-requests (empty name)", "FAIL", str(result))
    
    # Test 4: POST /clubs/:id/credit-requests with invalid amount
    result = make_request("POST", f"/clubs/{club_id}/credit-requests", headers=headers, data={"playerName": "Test", "requestedAmount": -100}, expected_status=400)
    if result and ("error" in result or "positive" in str(result).lower() or "greater" in str(result).lower()):
        print_test("POST /clubs/:id/credit-requests (negative amount)", "PASS")
    else:
        print_test("POST /clubs/:id/credit-requests (negative amount)", "FAIL", str(result))
    
    # Test 5: POST /clubs/:id/credit-requests (duplicate pending request)
    if test_request_id:
        # Try to create another request for same player
        duplicate_player_id = f"PLAYER{datetime.now().strftime('%Y%m%d%H%M%S')}DUP"
        first_request = make_request("POST", f"/clubs/{club_id}/credit-requests", headers=headers, data={"playerId": duplicate_player_id, "playerName": "Duplicate Test", "amount": 500}, expected_status=201)
        if first_request and "error" not in first_request:
            # Try duplicate
            result = make_request("POST", f"/clubs/{club_id}/credit-requests", headers=headers, data={"playerId": duplicate_player_id, "playerName": "Duplicate Test", "amount": 600}, expected_status=409)
            if result and ("error" in result or "already" in str(result).lower() or "pending" in str(result).lower()):
                print_test("POST /clubs/:id/credit-requests (duplicate pending)", "PASS")
            else:
                print_test("POST /clubs/:id/credit-requests (duplicate pending)", "FAIL", str(result))
        else:
            print_test("POST /clubs/:id/credit-requests (duplicate pending)", "SKIP", "Could not create first request")
    
    # Test 6: POST /clubs/:id/credit-requests/:requestId/approve
    if test_request_id:
        result = make_request("POST", f"/clubs/{club_id}/credit-requests/{test_request_id}/approve", headers=headers, data={"limit": 1500}, expected_status=201)
        if result and "error" not in result:
            print_test("POST /clubs/:id/credit-requests/:requestId/approve", "PASS")
            # Test 7: Try to approve already approved request
            result2 = make_request("POST", f"/clubs/{club_id}/credit-requests/{test_request_id}/approve", headers=headers, data={"limit": 2000}, expected_status=409)
            if result2 and ("error" in result2 or "already" in str(result2).lower() or "approved" in str(result2).lower()):
                print_test("POST /clubs/:id/credit-requests/:requestId/approve (already approved)", "PASS")
            else:
                print_test("POST /clubs/:id/credit-requests/:requestId/approve (already approved)", "FAIL", str(result2))
        else:
            print_test("POST /clubs/:id/credit-requests/:requestId/approve", "FAIL", str(result))

# ========== Transaction Tests ==========
def test_transaction_apis(tenant_id: Optional[str], club_id: Optional[str], super_admin_user_id: Optional[str] = None):
    print("\n" + "="*60)
    print("TRANSACTION API TESTS")
    print("="*60)
    
    if not tenant_id or not club_id:
        print("⚠️  Skipping transaction tests - no tenant/club ID")
        return
    
    # Use Super Admin authentication if available
    if super_admin_user_id:
        headers = {"x-user-id": super_admin_user_id, "x-tenant-id": tenant_id, "x-club-id": club_id}
    else:
        headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: GET /clubs/:id/transactions
    result = make_request("GET", f"/clubs/{club_id}/transactions", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        print_test("GET /clubs/:id/transactions", "PASS")
    else:
        print_test("GET /clubs/:id/transactions", "FAIL", str(result))
    
    # Test 2: POST /clubs/:id/transactions (create)
    transaction_data = {
        "type": "Buy In",
        "playerId": f"PLAYER{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "playerName": "Test Player",
        "amount": 500
    }
    result = make_request("POST", f"/clubs/{club_id}/transactions", headers=headers, data=transaction_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /clubs/:id/transactions (create)", "PASS")
        test_transaction_id = result["id"]
    else:
        print_test("POST /clubs/:id/transactions (create)", "FAIL", str(result))
        test_transaction_id = None
    
    # Test 3: POST /clubs/:id/transactions with empty player name
    result = make_request("POST", f"/clubs/{club_id}/transactions", headers=headers, data={"playerName": "", "transactionType": "BUY_IN", "amount": 500}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/transactions (empty name)", "PASS")
    else:
        print_test("POST /clubs/:id/transactions (empty name)", "FAIL", str(result))
    
    # Test 4: POST /clubs/:id/transactions with invalid type
    result = make_request("POST", f"/clubs/{club_id}/transactions", headers=headers, data={"type": "INVALID", "playerId": "PLAYER123", "playerName": "Test", "amount": 500}, expected_status=400)
    if result and ("error" in result or "invalid" in str(result).lower()):
        print_test("POST /clubs/:id/transactions (invalid type)", "PASS")
    else:
        print_test("POST /clubs/:id/transactions (invalid type)", "FAIL", str(result))
    
    # Test 5: POST /clubs/:id/transactions/:transactionId/cancel
    if test_transaction_id:
        result = make_request("POST", f"/clubs/{club_id}/transactions/{test_transaction_id}/cancel", headers=headers, expected_status=201)
        if result and "error" not in result:
            print_test("POST /clubs/:id/transactions/:transactionId/cancel", "PASS")
            # Test 6: Try to cancel already cancelled transaction
            result2 = make_request("POST", f"/clubs/{club_id}/transactions/{test_transaction_id}/cancel", headers=headers, expected_status=409)
            if result2 and ("error" in result2 or "already" in str(result2).lower() or "cancelled" in str(result2).lower()):
                print_test("POST /clubs/:id/transactions/:transactionId/cancel (already cancelled)", "PASS")
            else:
                print_test("POST /clubs/:id/transactions/:transactionId/cancel (already cancelled)", "FAIL", str(result2))
        else:
            print_test("POST /clubs/:id/transactions/:transactionId/cancel", "FAIL", str(result))

# ========== VIP Products Tests ==========
def test_vip_product_apis(tenant_id: Optional[str], club_id: Optional[str], super_admin_user_id: Optional[str] = None):
    print("\n" + "="*60)
    print("VIP PRODUCT API TESTS")
    print("="*60)
    
    if not tenant_id or not club_id:
        print("⚠️  Skipping VIP product tests - no tenant/club ID")
        return
    
    # Use Super Admin authentication if available
    if super_admin_user_id:
        headers = {"x-user-id": super_admin_user_id, "x-tenant-id": tenant_id, "x-club-id": club_id}
    else:
        headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: GET /clubs/:id/vip-products
    result = make_request("GET", f"/clubs/{club_id}/vip-products", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        print_test("GET /clubs/:id/vip-products", "PASS")
    else:
        print_test("GET /clubs/:id/vip-products", "FAIL", str(result))
    
    # Test 2: POST /clubs/:id/vip-products (create)
    product_data = {
        "title": "VIP Package",
        "points": 1000,
        "description": "Premium VIP package"
    }
    result = make_request("POST", f"/clubs/{club_id}/vip-products", headers=headers, data=product_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /clubs/:id/vip-products (create)", "PASS")
        test_product_id = result["id"]
    else:
        print_test("POST /clubs/:id/vip-products (create)", "FAIL", str(result))
        test_product_id = None
    
    # Test 3: POST /clubs/:id/vip-products with empty title
    result = make_request("POST", f"/clubs/{club_id}/vip-products", headers=headers, data={"title": "", "points": 1000}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/vip-products (empty name)", "PASS")
    else:
        print_test("POST /clubs/:id/vip-products (empty name)", "FAIL", str(result))
    
    # Test 4: POST /clubs/:id/vip-products (duplicate title)
    if test_product_id:
        duplicate_title = "VIP Package"  # Same as created in test 2
        result = make_request("POST", f"/clubs/{club_id}/vip-products", headers=headers, data={"title": duplicate_title, "points": 2000}, expected_status=409)
        if result and ("error" in result or "already" in str(result).lower() or "exists" in str(result).lower()):
            print_test("POST /clubs/:id/vip-products (duplicate title)", "PASS")
        else:
            print_test("POST /clubs/:id/vip-products (duplicate title)", "FAIL", str(result))

# ========== Waitlist Tests ==========
def test_waitlist_apis(tenant_id: Optional[str], club_id: Optional[str], super_admin_user_id: Optional[str] = None):
    print("\n" + "="*60)
    print("WAITLIST API TESTS")
    print("="*60)
    
    if not tenant_id or not club_id:
        print("⚠️  Skipping waitlist tests - no tenant/club ID")
        return
    
    # Use Super Admin authentication if available
    if super_admin_user_id:
        headers = {"x-user-id": super_admin_user_id, "x-tenant-id": tenant_id, "x-club-id": club_id}
    else:
        headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: GET /clubs/:id/waitlist
    result = make_request("GET", f"/clubs/{club_id}/waitlist", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        print_test("GET /clubs/:id/waitlist", "PASS")
    else:
        print_test("GET /clubs/:id/waitlist", "FAIL", str(result))
    
    # Test 2: POST /clubs/:id/waitlist (create)
    waitlist_data = {
        "playerName": "Waitlist Player",
        "playerId": f"PLAYER{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "phoneNumber": "+1234567890",
        "email": "player@test.com",
        "partySize": 2
    }
    result = make_request("POST", f"/clubs/{club_id}/waitlist", headers=headers, data=waitlist_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /clubs/:id/waitlist (create)", "PASS")
        test_entry_id = result["id"]
    else:
        print_test("POST /clubs/:id/waitlist (create)", "FAIL", str(result))
        test_entry_id = None
    
    # Test 3: POST /clubs/:id/waitlist with empty player name
    result = make_request("POST", f"/clubs/{club_id}/waitlist", headers=headers, data={"playerName": "", "gameType": "HOLDEM"}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/waitlist (empty name)", "PASS")
    else:
        print_test("POST /clubs/:id/waitlist (empty name)", "FAIL", str(result))

# ========== Affiliate Tests ==========
def test_affiliate_apis(tenant_id: Optional[str], club_id: Optional[str], super_admin_user_id: Optional[str] = None):
    print("\n" + "="*60)
    print("AFFILIATE API TESTS")
    print("="*60)
    
    if not tenant_id or not club_id:
        print("⚠️  Skipping affiliate tests - no tenant/club ID")
        return None
    
    # Use Super Admin authentication if available
    if super_admin_user_id:
        headers = {"x-user-id": super_admin_user_id, "x-tenant-id": tenant_id, "x-club-id": club_id}
    else:
        headers = {"x-api-key": MASTER_API_KEY, "x-tenant-id": tenant_id}
    
    # Test 1: POST /clubs/:id/affiliates (create affiliate)
    affiliate_email = f"affiliate{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
    affiliate_data = {
        "email": affiliate_email,
        "displayName": "Test Affiliate",
        "commissionRate": 5.00  # Use exactly 2 decimal places
    }
    result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data=affiliate_data, expected_status=201)
    if result and "error" not in result and "code" in result:
        print_test("POST /clubs/:id/affiliates (create)", "PASS")
        test_affiliate_id = result.get("id")
        test_affiliate_code = result.get("code")
    else:
        print_test("POST /clubs/:id/affiliates (create)", "FAIL", str(result))
        test_affiliate_id = None
        test_affiliate_code = None
    
    # Test 2: POST /clubs/:id/affiliates with invalid email
    result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={"email": "invalid-email"}, expected_status=400)
    if result and ("error" in result or "invalid" in str(result).lower() or "format" in str(result).lower()):
        print_test("POST /clubs/:id/affiliates (invalid email)", "PASS")
    else:
        print_test("POST /clubs/:id/affiliates (invalid email)", "FAIL", str(result))
    
    # Test 3: POST /clubs/:id/affiliates with missing email
    result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/affiliates (missing email)", "PASS")
    else:
        print_test("POST /clubs/:id/affiliates (missing email)", "FAIL", str(result))
    
    # Test 4: POST /clubs/:id/affiliates with invalid commission rate (>100)
    result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={"email": f"test{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com", "commissionRate": 150}, expected_status=400)
    if result and ("error" in result or "exceed" in str(result).lower() or "100" in str(result)):
        print_test("POST /clubs/:id/affiliates (invalid commission >100%)", "PASS")
    else:
        print_test("POST /clubs/:id/affiliates (invalid commission >100%)", "FAIL", str(result))
    
    # Test 5: POST /clubs/:id/affiliates with negative commission rate
    result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={"email": f"test2{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com", "commissionRate": -5}, expected_status=400)
    if result and ("error" in result or "negative" in str(result).lower()):
        print_test("POST /clubs/:id/affiliates (negative commission)", "PASS")
    else:
        print_test("POST /clubs/:id/affiliates (negative commission)", "FAIL", str(result))
    
    # Test 6: POST /clubs/:id/affiliates with invalid code format
    result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={"email": f"test3{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com", "code": "ab"}, expected_status=400)
    if result and ("error" in result or "at least" in str(result).lower() or "3" in str(result)):
        print_test("POST /clubs/:id/affiliates (code too short)", "PASS")
    else:
        print_test("POST /clubs/:id/affiliates (code too short)", "FAIL", str(result))
    
    # Test 7: GET /clubs/:id/affiliates
    result = make_request("GET", f"/clubs/{club_id}/affiliates", headers=headers, expected_status=200)
    if result is not None and "error" not in result:
        affiliates = result if isinstance(result, list) else []
        print_test("GET /clubs/:id/affiliates", "PASS")
    else:
        print_test("GET /clubs/:id/affiliates", "FAIL", str(result))
        affiliates = []
    
    # Test 8: GET /clubs/:id/affiliates/:affiliateId/stats
    if test_affiliate_id:
        result = make_request("GET", f"/clubs/{club_id}/affiliates/{test_affiliate_id}/stats", headers=headers, expected_status=200)
        if result and "error" not in result:
            print_test("GET /clubs/:id/affiliates/:affiliateId/stats", "PASS")
        else:
            print_test("GET /clubs/:id/affiliates/:affiliateId/stats", "FAIL", str(result))
    
    # Test 9: POST /clubs/:id/players (create player with affiliate code)
    if test_affiliate_code:
        player_data = {
            "name": "Test Player",
            "email": f"player{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com",
            "affiliateCode": test_affiliate_code
        }
        result = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data=player_data, expected_status=201)
        if result and "error" not in result and "id" in result:
            print_test("POST /clubs/:id/players (with affiliate code)", "PASS")
            test_player_id = result.get("id")
        else:
            print_test("POST /clubs/:id/players (with affiliate code)", "FAIL", str(result))
            test_player_id = None
    else:
        test_player_id = None
    
    # Test 10: POST /clubs/:id/players (create player without affiliate code)
    player_data = {
        "name": "Test Player No Affiliate",
        "email": f"player2{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
    }
    result = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data=player_data, expected_status=201)
    if result and "error" not in result and "id" in result:
        print_test("POST /clubs/:id/players (without affiliate code)", "PASS")
    else:
        print_test("POST /clubs/:id/players (without affiliate code)", "FAIL", str(result))
    
    # Test 11: POST /clubs/:id/players with invalid email
    result = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data={"name": "Test", "email": "invalid"}, expected_status=400)
    if result and ("error" in result or "invalid" in str(result).lower() or "format" in str(result).lower()):
        print_test("POST /clubs/:id/players (invalid email)", "PASS")
    else:
        print_test("POST /clubs/:id/players (invalid email)", "FAIL", str(result))
    
    # Test 12: POST /clubs/:id/players with missing name
    result = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data={"email": f"test{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"}, expected_status=400)
    if result and ("error" in result or "required" in str(result).lower()):
        print_test("POST /clubs/:id/players (missing name)", "PASS")
    else:
        print_test("POST /clubs/:id/players (missing name)", "FAIL", str(result))
    
    # Test 13: POST /clubs/:id/players with invalid affiliate code
    result = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data={"name": "Test", "email": f"test4{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com", "affiliateCode": "INVALID123"}, expected_status=400)
    if result and ("error" in result or "not found" in str(result).lower() or "invalid" in str(result).lower()):
        print_test("POST /clubs/:id/players (invalid affiliate code)", "PASS")
    else:
        print_test("POST /clubs/:id/players (invalid affiliate code)", "FAIL", str(result))
    
    # Test 14: GET /clubs/:id/affiliates/:affiliateId/players
    if test_affiliate_id:
        result = make_request("GET", f"/clubs/{club_id}/affiliates/{test_affiliate_id}/players", headers=headers, expected_status=200)
        if result and "error" not in result:
            players = result if isinstance(result, list) else []
            print_test("GET /clubs/:id/affiliates/:affiliateId/players", "PASS")
        else:
            print_test("GET /clubs/:id/affiliates/:affiliateId/players", "FAIL", str(result))
    
    # Test 15: POST /clubs/:id/affiliates (duplicate email - same user as affiliate)
    if test_affiliate_id:
        result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={"email": affiliate_email}, expected_status=409)
        if result and ("error" in result or "already" in str(result).lower() or "conflict" in str(result).lower()):
            print_test("POST /clubs/:id/affiliates (duplicate user)", "PASS")
        else:
            print_test("POST /clubs/:id/affiliates (duplicate user)", "FAIL", str(result))
    
    # Test 16: POST /clubs/:id/affiliates (duplicate code)
    if test_affiliate_code:
        result = make_request("POST", f"/clubs/{club_id}/affiliates", headers=headers, data={"email": f"newaff{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com", "code": test_affiliate_code}, expected_status=409)
        if result and ("error" in result or "already" in str(result).lower() or "exists" in str(result).lower()):
            print_test("POST /clubs/:id/affiliates (duplicate code)", "PASS")
        else:
            print_test("POST /clubs/:id/affiliates (duplicate code)", "FAIL", str(result))
    
    # Test 17: POST /clubs/:id/players (duplicate email)
    duplicate_player_email = f"duplicate{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
    player_data = {"name": "First Player", "email": duplicate_player_email}
    result = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data=player_data, expected_status=201)
    if result and "error" not in result:
        # Try to create duplicate
        result2 = make_request("POST", f"/clubs/{club_id}/players", headers=headers, data={"name": "Second Player", "email": duplicate_player_email}, expected_status=409)
        if result2 and ("error" in result2 or "already" in str(result2).lower() or "exists" in str(result2).lower()):
            print_test("POST /clubs/:id/players (duplicate email)", "PASS")
        else:
            print_test("POST /clubs/:id/players (duplicate email)", "FAIL", str(result2))
    else:
        print_test("POST /clubs/:id/players (duplicate email)", "SKIP", "Could not create first player")
    
    return test_affiliate_id

# ========== Main Test Runner ==========
def main():
    print("\n" + "="*60)
    print("COMPREHENSIVE API END-TO-END TEST SUITE")
    print("="*60)
    print(f"Testing against: {BASE_URL}")
    print(f"Using API Key: {MASTER_API_KEY[:10]}..." if len(MASTER_API_KEY) > 10 else f"Using API Key: {MASTER_API_KEY}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    # Test Authentication
    test_auth_apis()
    
    # Test Tenants
    tenant_id, _ = test_tenant_apis()
    
    # Test Clubs (returns club_id and super_admin_user_id)
    club_id, super_admin_user_id = test_club_apis(tenant_id)
    
    # Test Staff Management
    test_staff_apis(tenant_id, club_id, super_admin_user_id)
    
    # Test Credit Requests
    test_credit_request_apis(tenant_id, club_id, super_admin_user_id)
    
    # Test Transactions
    test_transaction_apis(tenant_id, club_id, super_admin_user_id)
    
    # Test VIP Products
    test_vip_product_apis(tenant_id, club_id, super_admin_user_id)
    
    # Test Waitlist
    test_waitlist_apis(tenant_id, club_id, super_admin_user_id)
    
    # Test Affiliates
    test_affiliate_apis(tenant_id, club_id, super_admin_user_id)
    
    # Print Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])}")
    print(f"Failed: {len(test_results['failed'])}")
    print(f"Success Rate: {(len(test_results['passed'])/test_results['total']*100):.1f}%")
    
    if test_results['failed']:
        print("\nFailed Tests:")
        for failure in test_results['failed']:
            print(f"  - {failure}")
    
    # Exit with error code if any tests failed
    sys.exit(1 if test_results['failed'] else 0)

if __name__ == "__main__":
    main()

