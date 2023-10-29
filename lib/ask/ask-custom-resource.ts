import {
  CustomResource,
  CustomResourceProvider,
  CustomResourceProviderRuntime,
  Duration,
  IResolvable,
  Lazy,
  RemovalPolicy,
  Resource,
  Stack,
} from 'aws-cdk-lib';
import {SkillAuthenticationConfiguration} from '../constructs/skill';
import {Construct} from 'constructs';
import {AskSdkCall} from './ask-sdk-call';
import * as path from 'path';

/**
 * Properties for configuring an Ask Custom Resource.
 */
export interface AskCustomResourceProps {
  /** Timeout for the custom resource. */
  readonly timeout?: Duration;
  /** Removal policy for the custom resource. */
  readonly removalPolicy?: RemovalPolicy;
  /** Authentication configuration for the Alexa Skill. */
  readonly authenticationConfiguration: SkillAuthenticationConfiguration | IResolvable;
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

    const codeDir =
      path.extname(__filename) === '.ts'
        ? path.join(__dirname, '..', '..', 'dist', 'src', 'handlers', 'ask-custom-resource')
        : path.join(__dirname, '..', '..', 'src', 'handlers', 'ask-custom-resource');

    this.provider = CustomResourceProvider.getOrCreateProvider(this, 'Custom::ASK', {
      codeDirectory: codeDir,
      runtime: CustomResourceProviderRuntime.NODEJS_18_X,
    });

    this.customResource = new CustomResource(this, 'Resource', {
      resourceType: 'Custom::ASK',
      serviceToken: this.provider.serviceToken,
      pascalCaseProperties: true,
      removalPolicy: props.removalPolicy,
      properties: {
        authentication: props.authenticationConfiguration,
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
