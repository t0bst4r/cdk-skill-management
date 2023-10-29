import {Construct, IDependable} from 'constructs';
import {CfnPermission, IFunction} from 'aws-cdk-lib/aws-lambda';
import {ISkill, SkillType} from './skill';
import {AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId} from 'aws-cdk-lib/custom-resources';
import {PolicyStatement} from 'aws-cdk-lib/aws-iam';

/**
 * Properties for configuring a Skill Endpoint Permission.
 */
export interface SkillEndpointProps {
  /** The AWS Lambda function handler to configure the permission for. */
  readonly handler: IFunction;
}

/**
 * Interface representing a Skill Endpoint Permission.
 */
export interface ISkillEndpointPermission {
  /**
   * Configures a Skill Endpoint Permission for a specific skill.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param skill - The skill to configure the permission for.
   * @returns An IDependable object representing the configured permission.
   */
  configureSkillId(scope: Construct, id: string, skill: ISkill): IDependable;
}

/**
 * Class for configuring and managing Skill Endpoint Permissions.
 */
export class SkillEndpointPermission extends Construct implements ISkillEndpointPermission {
  private readonly principals: Record<SkillType, string> = {
    [SkillType.CUSTOM]: 'alexa-appkit.amazon.com',
    [SkillType.SMART_HOME]: 'alexa-connectedhome.amazon.com',
  };

  private readonly handler: IFunction;
  private readonly permission: CfnPermission;
  private readonly policy: AwsCustomResourcePolicy;

  /**
   * Creates an instance of the Skill Endpoint Permission.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param props - The Skill Endpoint properties.
   */
  constructor(scope: Construct, id: string, props: SkillEndpointProps) {
    super(scope, id);

    this.permission = new CfnPermission(this, 'InitialSkillPermission', {
      functionName: props.handler.functionArn,
      principal: this.principals[SkillType.CUSTOM],
      action: 'lambda:InvokeFunction',
    });

    this.policy = AwsCustomResourcePolicy.fromStatements([
      new PolicyStatement({
        actions: ['lambda:RemovePermission', 'lambda:AddPermission'],
        resources: [props.handler.functionArn],
      }),
    ]);

    this.handler = props.handler;
  }

  /**
   * Configures a Skill Endpoint Permission for a specific skill.
   * This replaces the initially created permission with a new permission checking for the SkillId.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param skill - The skill to configure the permission for.
   * @returns An IDependable object representing the configured permission.
   */
  public configureSkillId(scope: Construct, id: string, skill: ISkill): IDependable {
    const parent = new Construct(scope, id);
    new AwsCustomResource(parent, 'RemovePermission', {
      policy: this.policy,
      onCreate: this.removePermissionCall(parent, skill),
      onDelete: this.addPermissionCall(parent),
      installLatestAwsSdk: false,
    });
    new AwsCustomResource(parent, 'AddPermission', {
      policy: this.policy,
      onCreate: this.addPermissionCall(parent, skill),
      onDelete: this.removePermissionCall(parent, skill),
      installLatestAwsSdk: false,
    });
    parent.node.addDependency(this.permission, this.handler);
    return parent;
  }

  private removePermissionCall(scope: Construct, skill: ISkill): AwsSdkCall {
    return {
      service: 'Lambda',
      action: 'removePermission',
      parameters: {
        FunctionName: this.handler.functionArn,
        StatementId: this.permission.attrId,
      },
      physicalResourceId: PhysicalResourceId.of(`RemovePermission-${scope.node.addr}-${skill.skillId}`),
    };
  }

  private addPermissionCall(scope: Construct, skill?: ISkill): AwsSdkCall {
    return {
      service: 'Lambda',
      action: 'addPermission',
      parameters: {
        FunctionName: this.handler.functionArn,
        StatementId: this.permission.attrId,
        Principal: this.principals[skill?.skillType ?? SkillType.CUSTOM],
        Action: 'lambda:InvokeFunction',
        EventSourceToken: skill?.skillId,
      },
      physicalResourceId: PhysicalResourceId.of(`AddPermission-${scope.node.addr}-${skill?.skillId ?? 'no-skill'}`),
    };
  }
}
