/**
 * An error whose message was written for the person using the screen, with the reason in it ("logo.png is an image,
 * and proofs must be PDFs"). useApiErrorToast shows it as it is, where any other thrown error gets the generic line.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}
