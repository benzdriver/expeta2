import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module'; // Assuming AppModule imports ValidatorModule
import { ValidatorService } from '../validator.service';
import mongoose from 'mongoose';


describe('Validator Frontend-Backend Integration (e2e)', () => {
  let app: INestApplication;
  let validatorService: ValidatorService; // May not be needed if testing via HTTP requests

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      validatorService = moduleFixture.get<ValidatorService>(ValidatorService);
    } catch (error) {
      console.error("Failed to initialize Nest application for e2e tests. This might be due to the known circular dependency issue.", error);
      process.exit(1); 
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await mongoose.disconnect();
  });

  it.skip('should accept a request to validate generated code', async () => {
    const codeId = 'code-test-validate'; // Need setup/mocking
    const expectationId = 'exp-test-validate'; // Need setup/mocking
    const validationDto = { codeId, expectationId }; // Or however the frontend triggers this

    const validateResponse = await request(app.getHttpServer())
      .post('/validator/validate') // Assuming this is the endpoint
      .send(validationDto)
      .expect(201); // Expecting resource created (new validation process/result)

    const validationId = validateResponse.body.validationId; // Adjust based on actual response structure
    expect(validationId).toBeDefined();
    expect(validateResponse.body.status).toEqual('validating'); // Or similar initial status

  });

  it.skip('should allow fetching validation results for a specific code artifact', async () => {
    const validationId = 'val-test-fetch'; // Need setup/mocking

    const fetchResponse = await request(app.getHttpServer())
      .get(`/validator/results/${validationId}`) // Assuming this is the endpoint
      .expect(200);

    expect(fetchResponse.body._id).toEqual(validationId);
    expect(fetchResponse.body.codeId).toBeDefined();
    expect(fetchResponse.body.expectationId).toBeDefined();
    expect(fetchResponse.body.status).toMatch(/passed|failed/); // Expecting a final status
    expect(fetchResponse.body.score).toBeDefined();
    expect(fetchResponse.body.details).toBeDefined();
    expect(Array.isArray(fetchResponse.body.details)).toBe(true);
  });

  it.skip('should allow fetching the latest validation result for a given Code ID', async () => {
    const codeId = 'code-test-fetch-by-code'; // Need setup/mocking

    const fetchResponse = await request(app.getHttpServer())
      .get(`/validator/results/code/${codeId}`) // Assuming endpoint for latest result by code ID
      .expect(200);

    expect(fetchResponse.body.codeId).toEqual(codeId);
    expect(fetchResponse.body.status).toMatch(/passed|failed/);
  });



});
