/**
 *
 * @namespace faker.animal
 */
var Animal = function (faker) {
  var self = this;

  /**
   * dog
   *
   * @method faker.animal.dog
   */
  self.dog = function() {
    return faker.random.arrayElement(faker.definitions.animal.dog);
  };
  /**
   * cat
   *
   * @method faker.animal.cat
   */
  self.cat = function() {
    return faker.random.arrayElement(faker.definitions.animal.cat);
  };
  /**
   * snake  
   *
   * @method faker.animal.snake
   */
  self.snake = function() {
    return faker.random.arrayElement(faker.definitions.animal.snake);
  };
  /**
   * bear  
   *
   * @method faker.animal.bear
   */
  self.bear = function() {
    return faker.random.arrayElement(faker.definitions.animal.bear);
  };
  /**
   * lion  
   *
   * @method faker.animal.lion
   */
  self.lion = function() {
    return faker.random.arrayElement(faker.definitions.animal.lion);
  };
  /**
   * cetacean  
   *
   * @method faker.animal.cetacean
   */
  self.cetacean = function() {
    return faker.random.arrayElement(faker.definitions.animal.cetacean);
  };
  /**
   * horse 
   *
   * @method faker.animal.horse
   */
  self.horse = function() {
    return faker.random.arrayElement(faker.definitions.animal.horse);
  };
  /**
   * bird
   *
   * @method faker.animal.bird
   */
  self.bird = function() {
    return faker.random.arrayElement(faker.definitions.animal.bird);
  };
  /**
   * cow 
   *
   * @method faker.animal.cow
   */
  self.cow = function() {
    return faker.random.arrayElement(faker.definitions.animal.cow);
  };
  /**
   * fish
   *
   * @method faker.animal.fish
   */
  self.fish = function() {
    return faker.random.arrayElement(faker.definitions.animal.fish);
  };
  /**
   * crocodilia
   *
   * @method faker.animal.crocodilia
   */
  self.crocodilia = function() {
    return faker.random.arrayElement(faker.definitions.animal.crocodilia);
  };
  /**
   * insect  
   *
   * @method faker.animal.insect
   */
  self.insect = function() {
    return faker.random.arrayElement(faker.definitions.animal.insect);
  };
  /**
   * rabbit 
   *
   * @method faker.animal.rabbit
   */
  self.rabbit = function() {
    return faker.random.arrayElement(faker.definitions.animal.rabbit);
  };
  /**
   * type 
   *
   * @method faker.animal.type
   */
  self.type = function() {
    return faker.random.arrayElement(faker.definitions.animal.type);
  };

  return self;
};

module['exports'] = Animal;
