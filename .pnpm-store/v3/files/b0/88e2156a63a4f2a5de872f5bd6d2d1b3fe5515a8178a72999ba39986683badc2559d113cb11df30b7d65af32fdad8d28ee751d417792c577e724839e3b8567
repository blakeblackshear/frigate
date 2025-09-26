var path = require('path'),
  fs = require('fs');
let collectionPath = path.resolve(__dirname, '../test/codegen/newman/fixtures/formdataFileCollection.json'),
  collection = require(collectionPath),
  formdata = collection.item[0].request.body.formdata,
  binaryFormdata = collection.item[1].request.body.formdata;
formdata[0].src = path.resolve(__dirname, '../dummyFile1.txt');
formdata[1].src[0] = path.resolve(__dirname, '../dummyFile2.txt');
formdata[1].src[1] = path.resolve(__dirname, '../dummyFile3.txt');
binaryFormdata[0].src = path.resolve(__dirname, '../dummyBinaryFile');

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), function (error) {
  if (error) {
    console.log('Error while writing collection to file: ', error);
  }
});
