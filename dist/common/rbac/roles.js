"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubRole = exports.TenantRole = exports.GlobalRole = void 0;
var GlobalRole;
(function (GlobalRole) {
    GlobalRole["MASTER_ADMIN"] = "MASTER_ADMIN";
})(GlobalRole || (exports.GlobalRole = GlobalRole = {}));
var TenantRole;
(function (TenantRole) {
    TenantRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(TenantRole || (exports.TenantRole = TenantRole = {}));
var ClubRole;
(function (ClubRole) {
    ClubRole["ADMIN"] = "ADMIN";
    ClubRole["MANAGER"] = "MANAGER";
    ClubRole["HR"] = "HR";
    ClubRole["STAFF"] = "STAFF";
    ClubRole["AFFILIATE"] = "AFFILIATE";
    ClubRole["CASHIER"] = "CASHIER";
    ClubRole["GRE"] = "GRE";
    ClubRole["FNB"] = "FNB";
})(ClubRole || (exports.ClubRole = ClubRole = {}));
//# sourceMappingURL=roles.js.map