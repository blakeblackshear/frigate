import { includes } from "lodash-es";
import {
  IRecognitionException,
  IRecognizerContext,
  IToken,
} from "@chevrotain/types";

const MISMATCHED_TOKEN_EXCEPTION = "MismatchedTokenException";
const NO_VIABLE_ALT_EXCEPTION = "NoViableAltException";
const EARLY_EXIT_EXCEPTION = "EarlyExitException";
const NOT_ALL_INPUT_PARSED_EXCEPTION = "NotAllInputParsedException";

const RECOGNITION_EXCEPTION_NAMES = [
  MISMATCHED_TOKEN_EXCEPTION,
  NO_VIABLE_ALT_EXCEPTION,
  EARLY_EXIT_EXCEPTION,
  NOT_ALL_INPUT_PARSED_EXCEPTION,
];

Object.freeze(RECOGNITION_EXCEPTION_NAMES);

// hacks to bypass no support for custom Errors in javascript/typescript
export function isRecognitionException(error: Error) {
  // can't do instanceof on hacked custom js exceptions
  return includes(RECOGNITION_EXCEPTION_NAMES, error.name);
}

abstract class RecognitionException
  extends Error
  implements IRecognitionException
{
  context: IRecognizerContext;
  resyncedTokens: IToken[] = [];

  protected constructor(
    message: string,
    public token: IToken,
  ) {
    super(message);

    // fix prototype chain when typescript target is ES5
    Object.setPrototypeOf(this, new.target.prototype);

    /* istanbul ignore next - V8 workaround to remove constructor from stacktrace when typescript target is ES5 */
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class MismatchedTokenException extends RecognitionException {
  constructor(
    message: string,
    token: IToken,
    public previousToken: IToken,
  ) {
    super(message, token);
    this.name = MISMATCHED_TOKEN_EXCEPTION;
  }
}

export class NoViableAltException extends RecognitionException {
  constructor(
    message: string,
    token: IToken,
    public previousToken: IToken,
  ) {
    super(message, token);
    this.name = NO_VIABLE_ALT_EXCEPTION;
  }
}

export class NotAllInputParsedException extends RecognitionException {
  constructor(message: string, token: IToken) {
    super(message, token);
    this.name = NOT_ALL_INPUT_PARSED_EXCEPTION;
  }
}

export class EarlyExitException extends RecognitionException {
  constructor(
    message: string,
    token: IToken,
    public previousToken: IToken,
  ) {
    super(message, token);
    this.name = EARLY_EXIT_EXCEPTION;
  }
}
