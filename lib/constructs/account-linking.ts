import {Construct, IConstruct} from 'constructs';
import type {ISkill} from './skill';
import {AskCustomResource} from '../ask/ask-custom-resource';
import {SkillAuthenticationProps} from './skill-authentication-props';

/**
 * Represents a platform-specific authorization URL for account linking.
 */
export interface AccountLinkingPlatformAuthorizationUrl {
  /** The platform type */
  readonly platformType: 'iOS' | 'Android';
  /** The platform-specific authorization URL. */
  readonly platformAuthorizationUrl: string;
}

/**
 * Represents the request parameters for account linking.
 */
export interface AccountLinkingRequest {
  /** The type of account linking */
  readonly authenticationFlowType?: 'AUTH_CODE' | 'IMPLICIT';
  /** The authorization URL for account linking. */
  readonly authorizationUrl?: string;
  /** An array of domains for account linking. */
  readonly domains?: Array<string>;
  /** The client ID for account linking. **/
  readonly clientId?: string;
  /** An array of scopes for account linking. */
  readonly scopes?: Array<string>;
  /** The access token URL for account linking. */
  readonly accessTokenUrl?: string;
  /** The client secret for account linking. */
  readonly clientSecret?: string;
  /** The access token scheme. */
  readonly accessTokenScheme?: 'HTTP_BASIC' | 'REQUEST_BODY_CREDENTIALS';
  /** The default token expiration in seconds for account linking. */
  readonly defaultTokenExpirationInSeconds?: number;
  /** The reciprocal access token URL for account linking. */
  readonly reciprocalAccessTokenUrl?: string;
  /** An array of redirect URLs for account linking. */
  readonly redirectUrl?: Array<string>;
  /** An array of platform-specific authorization URLs for account linking. */
  readonly authorizationUrlsByPlatform?: Array<AccountLinkingPlatformAuthorizationUrl>;
  /** Indicates whether to skip account linking on enablement. */
  readonly skipOnEnablement?: boolean;
  /** Voice-forward account linking setting, either 'ENABLED' or 'DISABLED'. */
  readonly voiceForwardAccountLinking?: 'ENABLED' | 'DISABLED';
}

/**
 * Interface representing an Account Linking resource.
 */
export interface IAccountLinking extends IConstruct {}

/**
 * Properties for creating an Account Linking resource.
 */
export interface AccountLinkingProps extends SkillAuthenticationProps {
  /** The Alexa Skill for which account linking is configured. */
  readonly skill: ISkill;
  /** The request parameters for account linking. */
  readonly request: AccountLinkingRequest;
}

/**
 * Represents an Account Linking resource for an Alexa Skill.
 */
export class AccountLinking extends Construct implements IAccountLinking {
  private readonly resource: AskCustomResource;

  /**
   * Creates an instance of the Account Linking resource.
   * @param scope - The construct scope.
   * @param id - The construct ID.
   * @param props - The Account Linking properties.
   */
  constructor(scope: Construct, id: string, props: AccountLinkingProps) {
    super(scope, id);

    this.resource = new AskCustomResource(this, 'Default', {
      authenticationConfiguration: props.authenticationConfiguration,
      authenticationConfigurationSecret: props.authenticationConfigurationSecret,
      authenticationConfigurationParameter: props.authenticationConfigurationParameter,
      onUpdate: {
        action: 'updateAccountLinkingInfoV1',
        parameters: [
          props.skill.skillId,
          props.skill.skillStage,
          {
            accountLinkingRequest: {
              ...props.request,
              type: props.request.authenticationFlowType,
              authenticationFlowType: undefined,
            },
          },
        ],
      },
      onDelete: {
        action: 'deleteAccountLinkingInfoV1',
        parameters: [props.skill.skillId, props.skill.skillStage],
      },
    });
    this.resource.node.addDependency(props.skill);
  }
}
