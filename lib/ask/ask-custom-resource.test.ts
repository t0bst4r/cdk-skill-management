import {App, Stack} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {AskCustomResource} from './ask-custom-resource';
import {Skill, SkillType} from '../constructs/skill';

test('AskCustomResource', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const skillCredentials = Secret.fromSecretNameV2(stack, 'SkillCredentials', '/Skill/Credentials');

  const skill = Skill.fromAttributes(stack, 'Skill', {
    skillId: 'My-Skill-Id',
    skillStage: 'development',
    skillType: SkillType.SMART_HOME,
  });
  new AskCustomResource(stack, 'AccountLinking', {
    authenticationConfigurationSecret: skillCredentials,
    onUpdate: {
      action: 'updateAccountLinkingInfoV1',
      parameters: [skill.skillId, skill.skillStage, {accountLinkingRequest: {my: 1, awesome: 2, props: 3}}],
    },
    onDelete: {
      action: 'deleteAccountLinkingInfoV1',
      parameters: [skill.skillId, skill.skillStage],
    },
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
