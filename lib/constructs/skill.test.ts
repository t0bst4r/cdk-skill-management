import {App, Stack} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {Skill, SkillType} from './skill';
import {StringParameter} from 'aws-cdk-lib/aws-ssm';
import {Secret} from 'aws-cdk-lib/aws-secretsmanager';
import {Asset} from 'aws-cdk-lib/aws-s3-assets';
import {Function} from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

test('Skill', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  const vendorId = StringParameter.fromStringParameterName(stack, 'VendorId', '/Skill/VendorId');
  const skillCredentials = Secret.fromSecretNameV2(stack, 'SkillCredentials', '/Skill/Credentials');
  const skillPackage = new Asset(stack, 'SkillPackage', {
    path: path.join(__dirname, '__test__', 'skill-package'),
  });
  const skillEndpoint = Function.fromFunctionName(stack, 'SkillEndpoint', 'MySkillEndpointFunction');

  new Skill(stack, 'Skill', {
    skillStage: 'development',
    skillType: SkillType.CUSTOM,
    vendorId: vendorId.stringValue,
    authenticationConfiguration: {
      clientId: skillCredentials.secretValueFromJson('clientId').unsafeUnwrap(),
      clientSecret: skillCredentials.secretValueFromJson('clientSecret').unsafeUnwrap(),
      refreshToken: skillCredentials.secretValueFromJson('refreshToken').unsafeUnwrap(),
    },
    skillPackage: {
      asset: skillPackage,
      overrides: {
        manifest: {
          apis: {smartHome: {endpoint: {uri: skillEndpoint.functionArn}}},
        },
      },
    },
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
