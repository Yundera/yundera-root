import { describe, it, before, after, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import request from "supertest";
import { createTestApp } from "./test-app.js";
import {
  generateTestUserId,
  createTestUser,
  deleteTestUser,
  signMessage,
  getTestUserData,
  cleanupAllTestUsers,
} from "./test-helpers.js";
import type { Application } from "express";

describe("IP Registration API", () => {
  let app: Application;
  let testUserId: string;
  let testKeys: { publicKey: string; privateKey: string };

  before(async () => {
    app = createTestApp();
    // Clean up any leftover test data
    await cleanupAllTestUsers();
  });

  after(async () => {
    // Final cleanup
    await cleanupAllTestUsers();
  });

  beforeEach(async () => {
    // Create a fresh test user for each test
    testUserId = generateTestUserId();
    testKeys = await createTestUser(testUserId);
  });

  afterEach(async () => {
    // Clean up the test user
    try {
      await deleteTestUser(testUserId);
    } catch (e) {
      // Ignore if already deleted
    }
  });

  describe("POST /ip/:userid/:sig", () => {
    it("should register VPN IP with valid signature", async () => {
      const vpnIp = "10.77.0.100";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp })
        .expect(200);

      expect(response.body.message).to.equal("VPN IP registered successfully.");
      expect(response.body.vpnIp).to.equal(vpnIp);

      // Verify in database
      const userData = await getTestUserData(testUserId);
      expect(userData?.vpnIp).to.equal(vpnIp);
      expect(userData?.vpnIpUpdatedAt).to.be.a("string");
    });

    it("should reject invalid signature", async () => {
      const vpnIp = "10.77.0.100";
      const invalidSignature = "k1234567890invalidSignature";

      const response = await request(app)
        .post(`/ip/${testUserId}/${invalidSignature}`)
        .send({ vpnIp })
        .expect(401);

      expect(response.body.error).to.equal("Invalid signature.");
    });

    it("should reject missing vpnIp in body", async () => {
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({})
        .expect(400);

      expect(response.body.error).to.equal("vpnIp is required in request body.");
    });

    it("should reject invalid IP format", async () => {
      const invalidIp = "not.an.ip.address";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: invalidIp })
        .expect(500); // Domain.ts throws error which results in 500

      expect(response.body.error).to.include("Invalid IP address format");
    });

    it("should reject non-existent user", async () => {
      const fakeUserId = "nonexistentuser12345";
      const signature = await signMessage(testKeys.privateKey, fakeUserId);

      const response = await request(app)
        .post(`/ip/${fakeUserId}/${signature}`)
        .send({ vpnIp: "10.77.0.100" })
        .expect(404);

      expect(response.body.error).to.equal("User not found. Register a domain first.");
    });

    it("should accept valid full IPv6 address", async () => {
      const vpnIpv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: vpnIpv6 })
        .expect(200);

      expect(response.body.vpnIp).to.equal(vpnIpv6);
    });

    it("should accept compressed IPv6 address (::1)", async () => {
      const vpnIpv6 = "::1";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: vpnIpv6 })
        .expect(200);

      expect(response.body.vpnIp).to.equal(vpnIpv6);
    });

    it("should accept compressed IPv6 address (fe80::1)", async () => {
      const vpnIpv6 = "fe80::1";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: vpnIpv6 })
        .expect(200);

      expect(response.body.vpnIp).to.equal(vpnIpv6);
    });

    it("should accept compressed IPv6 address (2001:db8::)", async () => {
      const vpnIpv6 = "2001:db8::";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: vpnIpv6 })
        .expect(200);

      expect(response.body.vpnIp).to.equal(vpnIpv6);
    });

    it("should reject invalid IPv6 with multiple ::", async () => {
      const invalidIpv6 = "2001::db8::1";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: invalidIpv6 })
        .expect(500);

      expect(response.body.error).to.include("Invalid IP address format");
    });

    it("should update existing IP with new value", async () => {
      const firstIp = "10.77.0.100";
      const secondIp = "10.77.0.200";
      const signature = await signMessage(testKeys.privateKey, testUserId);

      // Register first IP
      await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: firstIp })
        .expect(200);

      // Update with second IP
      await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp: secondIp })
        .expect(200);

      // Verify updated
      const userData = await getTestUserData(testUserId);
      expect(userData?.vpnIp).to.equal(secondIp);
    });
  });

  describe("GET /resolve/:domain", () => {
    it("should resolve domain to IP", async () => {
      const vpnIp = "10.77.0.150";
      const signature = await signMessage(testKeys.privateKey, testUserId);
      // domainName is the same as testUserId (alphanumeric)
      const domainName = testUserId;

      // First register the IP
      await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp })
        .expect(200);

      // Then resolve it
      const response = await request(app)
        .get(`/resolve/${domainName}`)
        .expect(200);

      expect(response.body.vpnIp).to.equal(vpnIp);
      expect(response.body.domainName).to.equal(domainName);
      expect(response.body.serverDomain).to.equal("nsl.sh");
    });

    it("should return 404 for unknown domain", async () => {
      const response = await request(app)
        .get("/resolve/nonexistentdomain12345")
        .expect(404);

      expect(response.body.error).to.equal("Domain not found or no IP registered.");
    });

    it("should return 404 for domain without IP registered", async () => {
      // User exists but has no IP registered yet
      // domainName is the same as testUserId
      const domainName = testUserId;

      const response = await request(app)
        .get(`/resolve/${domainName}`)
        .expect(404);

      expect(response.body.error).to.equal("Domain not found or no IP registered.");
    });

    it("should handle case-insensitive domain lookup", async () => {
      const vpnIp = "10.77.0.160";
      const signature = await signMessage(testKeys.privateKey, testUserId);
      // domainName is the same as testUserId
      const domainName = testUserId;

      // Register IP
      await request(app)
        .post(`/ip/${testUserId}/${signature}`)
        .send({ vpnIp })
        .expect(200);

      // Resolve with uppercase (should be normalized to lowercase)
      const response = await request(app)
        .get(`/resolve/${domainName.toUpperCase()}`)
        .expect(200);

      expect(response.body.vpnIp).to.equal(vpnIp);
    });
  });

  describe("GET /available/:domain", () => {
    it("should return available for unused domain", async () => {
      const unusedDomain = "unuseddomain12345";

      const response = await request(app)
        .get(`/available/${unusedDomain}`)
        .expect(200);

      expect(response.body.available).to.equal(true);
      expect(response.body.message).to.equal("Domain name is available.");
    });

    it("should return unavailable for existing domain", async () => {
      // testUserId is also the domainName
      const domainName = testUserId;

      const response = await request(app)
        .get(`/available/${domainName}`)
        .expect(209); // Note: Using existing status code behavior

      expect(response.body.available).to.equal(false);
    });

    it("should return unavailable for reserved domains", async () => {
      const response = await request(app)
        .get("/available/root")
        .expect(209);

      expect(response.body.available).to.equal(false);
      expect(response.body.message).to.equal("Domain name is not available.");
    });

    it("should return unavailable for www reserved domain", async () => {
      const response = await request(app)
        .get("/available/www")
        .expect(209);

      expect(response.body.available).to.equal(false);
    });

    it("should reject invalid domain names", async () => {
      const response = await request(app)
        .get("/available/invalid-domain")
        .expect(209);

      expect(response.body.available).to.equal(false);
      expect(response.body.message).to.include("lowercase letters and numbers");
    });

    it("should reject domains with uppercase", async () => {
      const response = await request(app)
        .get("/available/InvalidDomain")
        .expect(209);

      expect(response.body.available).to.equal(false);
    });

    it("should reject domains longer than 63 characters", async () => {
      const longDomain = "a".repeat(64);

      const response = await request(app)
        .get(`/available/${longDomain}`)
        .expect(209);

      expect(response.body.available).to.equal(false);
      expect(response.body.message).to.include("63 characters");
    });
  });

  describe("GET /domain/:userid", () => {
    it("should return domain info for existing user", async () => {
      const response = await request(app)
        .get(`/domain/${testUserId}`)
        .expect(200);

      expect(response.body.domainName).to.equal(testUserId);
      expect(response.body.serverDomain).to.equal("nsl.sh");
      expect(response.body.publicKey).to.equal(testKeys.publicKey);
    });

    it("should return 280 for non-existent user", async () => {
      // Note: Using existing status code behavior (280 is non-standard)
      const response = await request(app)
        .get("/domain/nonexistentuser12345")
        .expect(280);

      expect(response.body.error).to.equal("User not found.");
    });
  });

  describe("GET /verify/:userid/:sig", () => {
    it("should return domain info for valid signature", async () => {
      const signature = await signMessage(testKeys.privateKey, testUserId);

      const response = await request(app)
        .get(`/verify/${testUserId}/${signature}`)
        .expect(200);

      expect(response.body.domainName).to.equal(testUserId);
      expect(response.body.serverDomain).to.equal("nsl.sh");
    });

    it("should return valid: false for invalid signature", async () => {
      const invalidSignature = "k1234567890invalidSignature";

      const response = await request(app)
        .get(`/verify/${testUserId}/${invalidSignature}`)
        .expect(200);

      expect(response.body.valid).to.equal(false);
    });

    it("should return error for unknown user", async () => {
      const signature = await signMessage(testKeys.privateKey, "unknownuser12345");

      const response = await request(app)
        .get(`/verify/unknownuser12345/${signature}`)
        .expect(200);

      expect(response.body.error).to.equal("unknown user");
    });
  });
});
