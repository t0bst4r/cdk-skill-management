import {App, Arn, ArnFormat, Stack} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {Skill, SkillType} from './skill';
import {Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {AccountLinking} from './account-linking';

test('AccountLinking', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const skillCredentials = Secret.fromSecretCompleteArn(
    stack,
    'SkillCredentials',
    Arn.format(
      {
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        service: 'secretsmanager',
        resource: 'secret',
        resourceName: '/Skill/Credentials',
      },
      stack
    )
  );

  const skill = Skill.fromAttributes(stack, 'Skill', {
    skillId: 'My-Skill-Id',
    skillStage: 'development',
    skillType: SkillType.SMART_HOME,
  });
  new AccountLinking(stack, 'AccountLinking', {
    skill,
    request: {
      authenticationFlowType: 'AUTH_CODE',
      authorizationUrl: `https://example.com/auth/authorize`,
      accessTokenUrl: `https://example.com/auth/token`,
      accessTokenScheme: 'REQUEST_BODY_CREDENTIALS',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['smart_home'],
    },
    authenticationConfigurationSecret: skillCredentials,
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
