import type {AskSdkCall, SkillAuthenticationConfiguration} from '../../../lib';
import type {CdkCustomResourceHandler} from 'aws-lambda';
import {StandardSmapiClientBuilder} from 'ask-smapi-sdk';

export const handler: CdkCustomResourceHandler = async event => {
  const sdkCall: AskSdkCall | undefined = getSdkCall(event.RequestType, event.ResourceProperties);
  if (!sdkCall) {
    return {};
  }

  const config = event.ResourceProperties.authentication as SkillAuthenticationConfiguration;

  const client = new StandardSmapiClientBuilder().withRefreshTokenConfig(config).client();
  const genericClient = client as object as Record<
    string,
    (...args: Array<unknown>) => Promise<Record<string, unknown>>
  >;
  const action = sdkCall.action in genericClient ? genericClient[sdkCall.action] : undefined;
  if (!action) {
    throw new Error(`ASK SDK does not provide an ${sdkCall.action} action`);
  }
  const boundAction = action.bind(client);
  const result = await boundAction(...sdkCall.parameters);
  return {Data: result};
};

function getSdkCall(type: 'Create' | 'Update' | 'Delete', properties: Record<string, unknown>): AskSdkCall | undefined {
  if (type === 'Create') {
    return (properties.create ?? properties.update) as AskSdkCall | undefined;
  }
  if (type === 'Update') {
    return properties.update as AskSdkCall | undefined;
  }
  return properties.delete as AskSdkCall | undefined;
}
