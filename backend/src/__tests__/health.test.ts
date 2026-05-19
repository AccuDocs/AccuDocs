import 'reflect-metadata';
import '../main/container';
import request from 'supertest';

import { createApp } from '../app';

describe('AccuDocs API health', () => {
  it('serves the versioned health endpoint', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      status: 'success',
      message: 'AccuDocs API is healthy',
    });
  });
});
