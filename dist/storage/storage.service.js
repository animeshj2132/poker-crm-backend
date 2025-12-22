"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const BUCKET = process.env.SUPABASE_BRANDING_BUCKET || 'branding';
let StorageService = StorageService_1 = class StorageService {
    constructor() {
        this.logger = new common_1.Logger(StorageService_1.name);
        this.client = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    async ensureBucket() {
        const { data: list } = await this.client.storage.listBuckets();
        const exists = (list || []).some((b) => b.name === BUCKET);
        if (!exists) {
            const { error } = await this.client.storage.createBucket(BUCKET, {
                public: true,
                fileSizeLimit: '5242880'
            });
            if (error)
                this.logger.error('Failed to create bucket', error);
        }
    }
    getPublicUrl(path) {
        var _a;
        const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
        return (_a = data === null || data === void 0 ? void 0 : data.publicUrl) !== null && _a !== void 0 ? _a : null;
    }
    async createSignedUploadUrl(path) {
        const { data, error } = await this.client.storage
            .from(BUCKET)
            .createSignedUploadUrl(path);
        if (error)
            throw error;
        return data;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
//# sourceMappingURL=storage.service.js.map