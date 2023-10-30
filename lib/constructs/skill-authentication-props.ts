import {CfnSkill} from 'aws-cdk-lib/alexa-ask';
import {IStringParameter} from 'aws-cdk-lib/aws-ssm';
import {ISecret} from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Type alias for Alexa Skill authentication configuration.
 */
export type SkillAuthenticationConfiguration = CfnSkill.AuthenticationConfigurationProperty;

/**
 * Properties for configuring the authentication properties for Skill Management.
 */
export interface SkillAuthenticationProps {
  /** Authentication configuration for the Alexa Skill. */
  readonly authenticationConfiguration?: SkillAuthenticationConfiguration;
  /** StringParameter holding the authentication configuration for the Alexa Skill. */
  readonly authenticationConfigurationParameter?: IStringParameter;
  /** Secret holding the authentication configuration for the Alexa Skill. */
  readonly authenticationConfigurationSecret?: ISecret;
}
