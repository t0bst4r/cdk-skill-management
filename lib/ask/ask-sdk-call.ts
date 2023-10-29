/**
 * Represents a call to an ASK (Alexa Skill Kit) SDK service.
 */
export interface AskSdkCall {
  /** The action or method to call in the ASK SDK service. */
  readonly action: string;
  /** An array of parameters to pass to the ASK SDK service call. */
  readonly parameters: Array<unknown>;
}
