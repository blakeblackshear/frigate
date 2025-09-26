/**
 *
 * @namespace faker.vehicle
 */
var Vehicle = function (faker) {
  var self = this;
  var fake = faker.fake;

  /**
   * vehicle
   *
   * @method faker.vehicle.vehicle
   */
  self.vehicle = function () {
    return fake('{{vehicle.manufacturer}} {{vehicle.model}}');
  };

  self.vehicle.schema = {
    "description": "Generates a random vehicle.",
    "sampleResults": ["BMW Explorer", "Ford Camry", "Lamborghini Ranchero"]
  };

  /**
   * manufacturer
   *
   * @method faker.vehicle.manufacturer
   */
  self.manufacturer = function () {
    return faker.random.arrayElement(faker.definitions.vehicle.manufacturer);
  };

  self.manufacturer.schema = {
    "description": "Generates a manufacturer name.",
    "sampleResults": ["Ford", "Jeep", "Tesla"]
  };


  /**
   * model
   *
   * @method faker.vehicle.model
   */
  self.model = function () {
    return faker.random.arrayElement(faker.definitions.vehicle.model);
  };

  self.model.schema = {
    "description": "Generates a vehicle model.",
    "sampleResults": ["Explorer", "Camry", "Ranchero"]
  };

  /**
   * type
   *
   * @method faker.vehicle.type
   */
  self.type = function () {
    return faker.random.arrayElement(faker.definitions.vehicle.type);
  };

  self.type.schema = {
    "description": "Generates a vehicle type.",
    "sampleResults": ["Coupe", "Convertable", "Sedan", "SUV"]
  };

  /**
   * fuel
   *
   * @method faker.vehicle.fuel
   */
  self.fuel = function () {
    return faker.random.arrayElement(faker.definitions.vehicle.fuel);
  };

  self.fuel.schema = {
    "description": "Generates a fuel type.",
    "sampleResults": ["Electric", "Gasoline", "Diesel"]
  };

  /**
   * vin
   *
   * @method faker.vehicle.vin
   */
  self.vin = function () {
    var bannedChars=['o','i','q'];
    return (
      faker.random.alphaNumeric(10, {bannedChars:bannedChars}) +
      faker.random.alpha({ count: 1, upcase: true ,bannedChars:bannedChars}) +
      faker.random.alphaNumeric(1, {bannedChars:bannedChars}) +
      faker.datatype.number({ min: 10000, max: 100000}) // return five digit #
    ).toUpperCase();
  };

  self.vin.schema = {
    "description": "Generates a valid VIN number.",
    "sampleResults": ["YV1MH682762184654", "3C7WRMBJ2EG208836"]
  };

  /**
   * color
   *
   * @method faker.vehicle.color
   */
  self.color = function () {
    return fake('{{commerce.color}}');
  };

  self.color.schema = {
    "description": "Generates a color",
    "sampleResults": ["red", "white", "black"]
  };

  /**
     * vrm
     *
     * @method faker.vehicle.vrm
     */
  self.vrm = function () {
    return (
      faker.random.alpha({ count: 2, upcase: true }) +
            faker.datatype.number({ min: 0, max: 9 }) +
            faker.datatype.number({ min: 0, max: 9 }) +
            faker.random.alpha({ count: 3, upcase: true })
    ).toUpperCase();
  };

  self.vrm.schema = {
    "description": "Generates a vehicle vrm",
    "sampleResults": ["MF56UPA", "GL19AAQ", "SF20TTA"]
  };

  /**
  * bicycle
  *
  * @method faker.vehicle.bicycle
  */
  self.bicycle = function () {
    return faker.random.arrayElement(faker.definitions.vehicle.bicycle_type);
  };

  self.bicycle.schema = {
    "description": "Generates a type of bicycle",
    "sampleResults": ["Adventure Road Bicycle", "City Bicycle", "Recumbent Bicycle"]
  };
};

module["exports"] = Vehicle;
