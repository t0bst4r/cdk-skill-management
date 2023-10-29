import {App, Stack} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {Skill, SkillType} from './skill';
import {Function} from 'aws-cdk-lib/aws-lambda';
import {SkillEndpointPermission} from './skill-endpoint-permission';

test('SkillEndpointPermission', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const endpointFunction = Function.fromFunctionName(stack, 'EndpointFunction', 'MyEndpointFunction');

  const endpointPermission = new SkillEndpointPermission(stack, 'EndpointPermission', {
    handler: endpointFunction,
  });
  const skill = Skill.fromAttributes(stack, 'Skill', {
    skillId: 'My-Skill-Id',
    skillStage: 'development',
    skillType: SkillType.SMART_HOME,
  });
  skill.node.addDependency(endpointPermission);
  endpointPermission.configureSkillId(stack, 'SkillPermission', skill);

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
