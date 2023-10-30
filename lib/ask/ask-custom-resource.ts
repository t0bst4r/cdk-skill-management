import {
  CustomResource,
  CustomResourceProvider,
  CustomResourceProviderRuntime,
  Duration,
  Lazy,
  RemovalPolicy,
  Resource,
  Stack,
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AskSdkCall} from './ask-sdk-call';
import * as path from 'path';
import {SkillAuthenticationProps} from '../constructs/skill-authentication-props';

/**
 * Properties for configuring an Ask Custom Resource.
 */
export interface AskCustomResourceProps extends SkillAuthenticationProps {
  /** Timeout for the custom resource. */
  readonly timeout?: Duration;
  /** Removal policy for the custom resource. */
  readonly removalPolicy?: RemovalPolicy;
  /** Action to perform on resource creation. */
  readonly onCreate?: AskSdkCall;
  /** Action to perform on resource update. */
  readonly onUpdate?: AskSdkCall;
  /** Action to perform on resource deletion. */
  readonly onDelete?: AskSdkCall;
}

/**
 * A custom CloudFormation resource for Alexa Skill Kit SDK calls.
 */
export class AskCustomResource extends Resource {
  private readonly provider: CustomResourceProvider;
  private readonly customResource: CustomResource;

  /**
   * Creates an instance of the Ask Custom Resource.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param props - The Ask Custom Resource properties.
   */
  constructor(scope: Construct, id: string, props: AskCustomResourceProps) {
    super(scope, id);

    const authPropsCount = [
      props.authenticationConfiguration,
      props.authenticationConfigurationParameter,
      props.authenticationConfigurationSecret,
    ].filter(it => !!it).length;

    if (authPropsCount !== 1) {
      throw new Error('Exactly one authentication configuration needs to be provided!');
    }

    const codeDir =
      path.extname(__filename) === '.ts'
        ? path.join(__dirname, '..', '..', 'dist', 'src', 'handlers', 'ask-custom-resource')
        : path.join(__dirname, '..', '..', 'src', 'handlers', 'ask-custom-resource');

    this.provider = CustomResourceProvider.getOrCreateProvider(this, 'Custom::ASK', {
      codeDirectory: codeDir,
      runtime: CustomResourceProviderRuntime.NODEJS_18_X,
    });

    if (props.authenticationConfigurationSecret) {
      this.provider.addToRolePolicy({
        Effect: 'Allow',
        Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
        Resource: props.authenticationConfigurationSecret.secretArn,
      });
    }
    if (props.authenticationConfigurationParameter) {
      this.provider.addToRolePolicy({
        Effect: 'Allow',
        Action: ['ssm:DescribeParameters', 'ssm:GetParameters', 'ssm:GetParameter', 'ssm:GetParameterHistory'],
        Resource: props.authenticationConfigurationParameter.parameterArn,
      });
    }

    this.customResource = new CustomResource(this, 'Resource', {
      resourceType: 'Custom::ASK',
      serviceToken: this.provider.serviceToken,
      removalPolicy: props.removalPolicy,
      properties: {
        authenticationConfiguration: props.authenticationConfiguration
          ? this.encodeJson(props.authenticationConfiguration)
          : undefined,
        authenticationConfigurationParameter: props.authenticationConfigurationParameter?.parameterName,
        authenticationConfigurationSecret: props.authenticationConfigurationSecret?.secretArn,
        create: props.onCreate ? this.encodeJson(props.onCreate) : undefined,
        update: props.onUpdate ? this.encodeJson(props.onUpdate) : undefined,
        delete: props.onDelete ? this.encodeJson(props.onDelete) : undefined,
      },
    });
  }

  /**
   * Gets the response field from the custom resource.
   * @param dataPath - The data path to retrieve from the response.
   * @returns The value of the response field.
   */
  public getResponseField(dataPath: string): string {
    return this.customResource.getAttString(dataPath);
  }

  private encodeJson(obj: unknown): string {
    return Lazy.uncachedString({produce: () => Stack.of(this).toJsonString(obj)});
  }
}
