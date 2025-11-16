const { MarineDomainValidator } = require('./src/testing/marine-domains/marine-domain-validator');

const validator = new MarineDomainValidator();

const autopilotData = {
  commandTimestamp: Date.now(),
  responseTimestamp: Date.now() + 500,
  commandedHeading: 180,
  actualHeading: 180
};

const result = validator.validateAutopilotAccuracy(autopilotData);
console.log('Autopilot result:', JSON.stringify(result, null, 2));
