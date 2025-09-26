import { ValidationError } from 'io-ts';
import { ErrorObject } from './types';
declare const errorsToRecord: (validateAllFieldCriteria: boolean) => (validationErrors: ReadonlyArray<ValidationError>) => ErrorObject;
export default errorsToRecord;
