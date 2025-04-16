import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module'; // Assuming AppModule imports GeneratorModule
import { GeneratorService } from '../generator.service';
import mongoose from 'mongoose';

describe('Generator Frontend-Backend Integration (e2e)', () => {
  let app: INestApplication;
  let generatorService: GeneratorService; // May not be needed if testing via HTTP requests

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      generatorService = moduleFixture.get<GeneratorService>(GeneratorService);
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error(
        'Failed to initialize Nest application for e2e tests. This might be due to the known circular dependency issue.',
        error,
      );
      process.exit(1);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await mongoose.disconnect();
  });

  it.skip('should accept a request to generate code based on expectations', async () => {
    const expectationId = 'test-expectation-id';
    const generationDto = {
      expectationId,
      options: { useSemanticAnalysis: true }
    };

    const generateResponse = await request(app.getHttpServer())
      .post('/generator/generate') // Assuming this is the endpoint
      .send(generationDto)
      .expect(201); // Expecting resource created (new code generation process/result)

    const codeId = generateResponse.body.codeId;
    expect(codeId).toBeDefined();
    expect(generateResponse.body.status).toEqual('generating'); // Or similar initial status
  });

  it.skip('should allow fetching generated code files', async () => {
    const codeId = 'test-code-id';

    const fetchResponse = await request(app.getHttpServer())
      .get(`/generator/code/${codeId}`) // Assuming this is the endpoint
      .expect(200);

    expect(fetchResponse.body._id).toEqual(codeId);
    expect(fetchResponse.body.files).toBeDefined();
    expect(Array.isArray(fetchResponse.body.files)).toBe(true);
    expect(fetchResponse.body.files.length).toBeGreaterThan(0);
    expect(fetchResponse.body.files[0].path).toBeDefined();
    expect(fetchResponse.body.files[0].content).toBeDefined();
  });

  //
  //
});
