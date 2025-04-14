import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module'; // Assuming AppModule imports ClarifierModule
import { ClarifierService } from '../clarifier.service';
import { ClarifierController } from '../clarifier.controller';
import mongoose from 'mongoose';


describe('Clarifier Frontend-Backend Integration (e2e)', () => {
  let app: INestApplication;
  let clarifierService: ClarifierService; // May not be needed if testing via HTTP requests

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      clarifierService = moduleFixture.get<ClarifierService>(ClarifierService);
    } catch (error) {
      console.error("Failed to initialize Nest application for e2e tests. This might be due to the known circular dependency issue.", error);
      process.exit(1); 
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await mongoose.disconnect(); // Ensure mongoose connection is closed
  });

  it('should accept a new requirement and initiate clarification', async () => {
    const requirementDto = { title: 'Test Requirement', text: 'Initial description' };
    
    const createResponse = await request(app.getHttpServer())
      .post('/clarifier/requirements') // Correct endpoint
      .send(requirementDto)
      .expect(201); // Expecting resource created status

    const requirementId = createResponse.body._id; // Adjust based on actual response structure
    expect(requirementId).toBeDefined();

    const statusResponse = await request(app.getHttpServer())
      .get(`/clarifier/requirements/${requirementId}`)
      .expect(200);
      
    expect(statusResponse.body.status).toEqual('clarifying'); // Or 'initial' depending on flow
  });

  it('should process a user clarification message', async () => {
    const requirementId = 'req-test-clarify'; // Need a way to set this up or mock it
    const questionId = 'q-test-clarify'; // Need a way to set this up or mock it
    const clarificationDto = { requirementId, questionId, answer: 'User provides more details' }; // Correct payload

    const clarifyResponse = await request(app.getHttpServer())
      .post(`/clarifier/answer`) // Correct endpoint
      .send(clarificationDto)
      .expect(200); // Expecting OK status

    const updatedStatusResponse = await request(app.getHttpServer())
      .get(`/clarifier/requirements/${requirementId}`) // Correct endpoint
      .expect(200);

  });

  it('should transition requirement status when clarification is sufficient', async () => {
    const requirementId = 'req-test-complete'; // Need setup/mocking


    const finalQuestionId = 'q-test-complete'; // Need setup/mocking
    const finalMessageDto = { requirementId, questionId: finalQuestionId, answer: 'Looks good!' }; // Correct payload
    await request(app.getHttpServer())
      .post(`/clarifier/answer`) // Correct endpoint
      .send(finalMessageDto)
      .expect(200);

    const finalStatusResponse = await request(app.getHttpServer())
      .get(`/clarifier/requirements/${requirementId}`) // Correct endpoint
      .expect(200);

    expect(finalStatusResponse.body.status).toEqual('expectations_generated'); // Or the next expected status
    expect(finalStatusResponse.body.summary).toBeDefined(); // Check if summary is provided
  });


});
