import type {AskSdkCall, SkillAuthenticationConfiguration} from '../../../lib';
import type {CdkCustomResourceHandler} from 'aws-lambda';
import {StandardSmapiClientBuilder} from 'ask-smapi-sdk';
import {GetParameterCommand, SSMClient} from '@aws-sdk/client-ssm';
import {GetSecretValueCommand, SecretsManagerClient} from '@aws-sdk/client-secrets-manager';

export const handler: CdkCustomResourceHandler = async event => {
  const sdkCall: AskSdkCall | undefined = getSdkCall(event.RequestType, event.ResourceProperties);
  if (!sdkCall) {
    console.log(`No SDK call configured for ${event.RequestType}`);
    return {};
  }

  const config = await getAuthenticationConfig(event.ResourceProperties);

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
  const result = await boundAction(...sdkCall.parameters).catch(e => {
    if (e.response) {
      if (e.response.message) {
        throw new Error(e.response.message + '\n' + JSON.stringify(e.response, undefined, 2));
      } else {
        throw new Error(JSON.stringify(e.response, undefined, 2));
      }
    }
    throw e;
  });
  return {Data: result};
};

function getSdkCall(type: 'Create' | 'Update' | 'Delete', properties: Record<string, unknown>): AskSdkCall | undefined {
  let result: string | undefined;
  if (type === 'Create') {
    result = (properties.create ?? properties.update) as string | undefined;
  } else if (type === 'Update') {
    result = properties.update as string | undefined;
  } else {
    result = properties.delete as string | undefined;
  }
  return result ? JSON.parse(result) : undefined;
}

async function getAuthenticationConfig(parameters: Record<string, unknown>): Promise<SkillAuthenticationConfiguration> {
  if (parameters.authenticationConfigurationSecret) {
    const secretsManager = new SecretsManagerClient({});
    const secret = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: parameters.authenticationConfigurationSecret as string,
      })
    );
    if (secret.SecretString) {
      return JSON.parse(secret.SecretString);
    } else {
      throw new Error(`Secret ${secret.SecretString} resolved to null`);
    }
  } else if (parameters.authenticationConfigurationParameter) {
    const ssm = new SSMClient({});
    const parameter = await ssm.send(
      new GetParameterCommand({
        Name: parameters.authenticationConfigurationParameter as string,
      })
    );
    if (parameter.Parameter?.Value) {
      return JSON.parse(parameter.Parameter.Value);
    } else {
      throw new Error(`Parameter ${parameters.authenticationConfigurationParameter} resolved to null`);
    }
  } else if (parameters.authenticationConfiguration) {
    return JSON.parse(parameters.authenticationConfiguration as string);
  } else {
    throw new Error('No authentication configuration provided');
  }
}
