import {IResource, Resource} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {CfnSkill} from 'aws-cdk-lib/alexa-ask';
import {Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {Asset} from 'aws-cdk-lib/aws-s3-assets';
import {SkillAuthenticationProps} from './skill-authentication-props';
import {ISecret} from 'aws-cdk-lib/aws-secretsmanager';
import {IStringParameter} from 'aws-cdk-lib/aws-ssm';

/**
 * Enumeration for different Alexa Skill types.
 */
export enum SkillType {
  CUSTOM = 'CUSTOM',
  SMART_HOME = 'SMART_HOME',
}

/**
 * Interface representing an Alexa Skill.
 */
export interface ISkill extends IResource {
  /** The unique ID of the Alexa Skill. */
  readonly skillId: string;
  /** The stage of the Alexa Skill. */
  readonly skillStage: string;
  /** The type of the Alexa Skill. */
  readonly skillType: SkillType;
}

/**
 * Base class for the Alexa Skill construct.
 */
abstract class SkillBase extends Resource implements ISkill {
  /**
   * The unique ID of the Alexa Skill.
   */
  public abstract readonly skillId: string;
  /**
   * The stage of the Alexa Skill.
   */
  public abstract readonly skillStage: string;
  /**
   * The type of the Alexa Skill.
   */
  public abstract readonly skillType: SkillType;
}

/**
 * Type alias for Alexa Skill package overrides.
 */
export type SkillPackageOverrides = CfnSkill.OverridesProperty;

/**
 * Interface representing an Alexa Skill package.
 */
export interface SkillPackage {
  /** The asset associated with the Alexa Skill package. */
  readonly asset: Asset;
  /** Overrides for the Alexa Skill package. */
  readonly overrides?: SkillPackageOverrides;
}

/**
 * Properties for creating an Alexa Skill.
 */
export interface SkillProps extends SkillAuthenticationProps {
  /** The type of the Alexa Skill. */
  readonly skillType: SkillType;
  /** The stage of the Alexa Skill. */
  readonly skillStage: string;
  /** The vendor ID of the Alexa Skill. */
  readonly vendorId: string;
  /** The package information for the Alexa Skill. */
  readonly skillPackage: SkillPackage;
}

/**
 * Properties for creating an Alexa Skill Instance from Attributes.
 */
export interface SkillAttributes {
  /**
   * The unique ID of the Alexa Skill.
   */
  readonly skillId: string;
  /**
   * The stage of the Alexa Skill.
   */
  readonly skillStage: string;
  /**
   * The type of the Alexa Skill.
   */
  readonly skillType: SkillType;
}

/**
 * Alexa Skill construct for managing an Alexa Skill via CloudFormation.
 */
export class Skill extends SkillBase {
  /**
   * Factory method to create an Alexa Skill from its ID.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param skillId - The ID of the Alexa Skill.
   * @returns The Alexa Skill construct.
   */
  public static fromSkillId(scope: Construct, id: string, skillId: string): ISkill {
    return new (class extends SkillBase {
      readonly skillId: string = skillId;

      get skillType(): SkillType {
        throw new Error('Access to skillType is not supported when using fromSkillId');
      }

      get skillStage(): string {
        throw new Error('Access to skillStage is not supported when using fromSkillId');
      }
    })(scope, id);
  }

  /**
   * Factory method to create an Alexa Skill from its attributes.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param attributes - The attributes of the Alexa Skill.
   * @returns The Alexa Skill construct.
   */
  public static fromAttributes(scope: Construct, id: string, attributes: SkillAttributes): ISkill {
    return new (class extends SkillBase {
      readonly skillId: string = attributes.skillId;
      readonly skillType: SkillType = attributes.skillType;
      readonly skillStage: string = attributes.skillStage;
    })(scope, id);
  }

  private readonly packageRole: Role;
  private readonly resource: CfnSkill;

  /**
   * The unique ID of the Alexa Skill.
   */
  public readonly skillId: string;
  /**
   * The stage of the Alexa Skill.
   */
  public readonly skillStage: string;
  /**
   * The type of the Alexa Skill.
   */
  public readonly skillType: SkillType;

  /**
   * Creates an instance of the Alexa Skill construct.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param props - The Alexa Skill properties.
   */
  constructor(scope: Construct, id: string, props: SkillProps) {
    super(scope, id);

    const authPropsCount = [
      props.authenticationConfiguration,
      props.authenticationConfigurationParameter,
      props.authenticationConfigurationSecret,
    ].filter(it => !!it).length;

    if (authPropsCount !== 1) {
      throw new Error('Exactly one authentication configuration needs to be provided!');
    }

    this.packageRole = new Role(this, 'PackageRole', {
      assumedBy: new ServicePrincipal('alexa-appkit.amazon.com'),
    });

    const authentication: CfnSkill.AuthenticationConfigurationProperty =
      this.authenticationSecret(props.authenticationConfigurationSecret) ??
      this.authenticationParameter(props.authenticationConfigurationParameter) ??
      props.authenticationConfiguration!;

    this.resource = new CfnSkill(this, 'Default', {
      skillPackage: {
        s3Bucket: props.skillPackage.asset.s3BucketName,
        s3Key: props.skillPackage.asset.s3ObjectKey,
        s3BucketRole: this.packageRole.roleArn,
        overrides: {
          ...props.skillPackage.overrides,
          manifest: {
            ...props.skillPackage.overrides?.manifest,
            publishingInformation: {
              category: props.skillType,
              ...props.skillPackage.overrides?.manifest?.publishingInformation,
            },
          },
        },
      },
      vendorId: props.vendorId,
      authenticationConfiguration: authentication,
    });
    this.resource.node.addDependency(this.packageRole);
    this.resource.node.addDependency(props.skillPackage.asset);
    props.skillPackage.asset.grantRead(this.packageRole);

    this.skillId = this.resource.ref;
    this.skillStage = props.skillStage;
    this.skillType = props.skillType;
  }

  private authenticationSecret(secret: ISecret | undefined): CfnSkill.AuthenticationConfigurationProperty | undefined {
    if (!secret) {
      return;
    }
    return {
      clientId: secret.secretValueFromJson('clientId').unsafeUnwrap(),
      clientSecret: secret.secretValueFromJson('clientSecret').unsafeUnwrap(),
      refreshToken: secret.secretValueFromJson('refreshToken').unsafeUnwrap(),
    };
  }

  private authenticationParameter(
    parameter: IStringParameter | undefined
  ): CfnSkill.AuthenticationConfigurationProperty | undefined {
    if (!parameter) {
      return;
    }
    return JSON.parse(parameter.stringValue);
  }
}
