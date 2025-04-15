import { jest } from '@jest/globals';

global.jest = jest;

require('./src/modules/validator/__tests__/skip-tests.js');
