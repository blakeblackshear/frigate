/**
 *
 * @namespace lorempicsum
 * @memberof faker.image
 */
var LoremPicsum = function (faker) {

    var self = this;

    /**
     * image
     *
     * @param {number} width
     * @param {number} height
     * @param {boolean} grayscale
     * @param {number} blur 1-10
     * @method faker.image.lorempicsum.image
     * @description search image from unsplash
     */
    self.image = function (width, height, grayscale, blur) {
      return self.imageUrl(width, height, grayscale, blur);
    };
    /**
     * imageGrayscaled
     *
     * @param {number} width
     * @param {number} height
     * @param {boolean} grayscale
     * @method faker.image.lorempicsum.imageGrayscaled
     * @description search grayscale image from unsplash
     */
    self.imageGrayscale = function (width, height, grayscale) {
      return self.imageUrl(width, height, grayscale);
    };
    /**
     * imageBlurred
     *
     * @param {number} width
     * @param {number} height
     * @param {number} blur 1-10
     * @method faker.image.lorempicsum.imageBlurred
     * @description search blurred image from unsplash
     */
    self.imageBlurred = function (width, height, blur) {
      return self.imageUrl(width, height, undefined, blur);
    };
    /**
     * imageRandomSeeded
     *
     * @param {number} width
     * @param {number} height
     * @param {boolean} grayscale
     * @param {number} blur 1-10
     * @param {string} seed
     * @method faker.image.lorempicsum.imageRandomSeeded
     * @description search same random image from unsplash, based on a seed
     */
    self.imageRandomSeeded = function (width, height, grayscale, blur, seed) {
      return self.imageUrl(width, height, grayscale, blur, seed);
    };
    /**
     * avatar
     *
     * @method faker.image.lorempicsum.avatar
     */
    self.avatar = function () {
      return faker.internet.avatar();
    };
    /**
     * imageUrl
     *
     * @param {number} width
     * @param {number} height
     * @param {boolean} grayscale
     * @param {number} blur 1-10
     * @param {string} seed
     * @method faker.image.lorempicsum.imageUrl
     */
    self.imageUrl = function (width, height, grayscale, blur, seed) {
        var width = width || 640;
        var height = height || 480;
  
        var url = 'https://picsum.photos';
          
        if (seed) {
          url += '/seed/' + seed;
        }

        url += '/' + width + '/' + height;
        
        if (grayscale && blur) {
          return url + '?grayscale' + '&blur=' + blur;
        }

        if (grayscale) {
          return url + '?grayscale';
        }

        if (blur) {
          return url + '?blur=' + blur;
        }
    
        return url;
    };
  }
  
  module["exports"] = LoremPicsum;
  