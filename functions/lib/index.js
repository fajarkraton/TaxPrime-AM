"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = exports.onSubscriptionCreateCalendar = exports.onAssetMaintenanceCalendar = exports.testMonthlyReport = exports.onMonthlyReport = exports.onSubscriptionExpiryCheck = exports.onAssetAssignment = exports.onTicketCreate = void 0;
const admin = __importStar(require("firebase-admin"));
// Inisialisasi Firebase Admin untuk Cloud Functions
admin.initializeApp();
// Triggers
__exportStar(require("./triggers/on-asset-write"), exports);
__exportStar(require("./triggers/on-user-create"), exports);
__exportStar(require("./triggers/on-image-upload"), exports);
__exportStar(require("./triggers/on-asset-index"), exports);
var on_ticket_create_1 = require("./triggers/tickets/on-ticket-create");
Object.defineProperty(exports, "onTicketCreate", { enumerable: true, get: function () { return on_ticket_create_1.onTicketCreate; } });
var on_asset_assignment_1 = require("./triggers/on-asset-assignment");
Object.defineProperty(exports, "onAssetAssignment", { enumerable: true, get: function () { return on_asset_assignment_1.onAssetAssignment; } });
var on_subscription_expiry_1 = require("./triggers/subscriptions/on-subscription-expiry");
Object.defineProperty(exports, "onSubscriptionExpiryCheck", { enumerable: true, get: function () { return on_subscription_expiry_1.onSubscriptionExpiryCheck; } });
var on_monthly_report_1 = require("./triggers/reports/on-monthly-report");
Object.defineProperty(exports, "onMonthlyReport", { enumerable: true, get: function () { return on_monthly_report_1.onMonthlyReport; } });
var test_monthly_report_1 = require("./triggers/reports/test-monthly-report");
Object.defineProperty(exports, "testMonthlyReport", { enumerable: true, get: function () { return test_monthly_report_1.testMonthlyReport; } });
var on_asset_maintenance_1 = require("./triggers/assets/on-asset-maintenance");
Object.defineProperty(exports, "onAssetMaintenanceCalendar", { enumerable: true, get: function () { return on_asset_maintenance_1.onAssetMaintenanceCalendar; } });
var on_subscription_create_calendar_1 = require("./triggers/subscriptions/on-subscription-create-calendar");
Object.defineProperty(exports, "onSubscriptionCreateCalendar", { enumerable: true, get: function () { return on_subscription_create_calendar_1.onSubscriptionCreateCalendar; } });
// Placeholder untuk exports HTTP nantinya
const helloWorld = async (request, response) => {
    response.send("ITAMS Functions Ready");
};
exports.helloWorld = helloWorld;
//# sourceMappingURL=index.js.map