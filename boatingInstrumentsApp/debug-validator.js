const { MarineDomainValidator, MARINE_ACCURACY_THRESHOLDS } = require('./src/testing/marine-domains/marine-domain-validator');

console.log('MarineDomainValidator:', typeof MarineDomainValidator);
console.log('MARINE_ACCURACY_THRESHOLDS:', typeof MARINE_ACCURACY_THRESHOLDS);

const validator = new MarineDomainValidator();
console.log('validator instance:', validator);

const navigationData = {
  latitude: 48.8566,
  longitude: 2.3522,
  referenceLatitude: 48.8566,
  referenceLongitude: 2.3522
};

const result = validator.validateNavigationAccuracy(navigationData);
console.log('result:', JSON.stringify(result, null, 2));
