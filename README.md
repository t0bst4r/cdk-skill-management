# cdk-skill-management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build status](https://img.shields.io/github/actions/workflow/status/t0bst4r/cdk-skill-management/release.yml?logo=github)](https://github.com/t0bst4r/cdk-skill-management)

[![Github version](https://img.shields.io/github/v/release/t0bst4r/cdk-skill-management?logo=github)](https://github.com/t0bst4r/cdk-skill-management)
[![npm](https://img.shields.io/npm/v/cdk-skill-management?logo=npm)](https://www.npmjs.com/package/cdk-skill-management)
[![PyPI version](https://img.shields.io/pypi/v/cdk-skill-management?logo=pypi)](https://pypi.org/project/cdk-skill-management/)

> Since I am only working with Node.js and TypeScript, the Python package is currently not tested / used.
> Therefore I am looking for someone to use and test it to provide feedback, if the library is actually working and if there are best practices to apply (e.g. namings, module name, etc.).

Your library for creating and managing Alexa Skills via CloudFormation using AWS CDK.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Node.js / TypeScript

To install the Node.js version of this library, use npm or yarn:

```bash
npm install cdk-skill-management
# or
yarn add cdk-skill-management
```

### Python
To install the Python version of this library, use pip:
```bash
pip install cdk-skill-management
```

## Usage
To use this library in your AWS CDK project, import and instantiate the classes you need.


### Regional restrictions
Skills can be deployed in every AWS regions, but Lambda Endpoints are restricted to
  - North America: `arn:aws:lambda:us-east-1:<aws_account_id>:function:<lambda_name>`
  - Europe, India: `arn:aws:lambda:eu-west-1:<aws_account_id>:function:<lambda_name>`
  - Far East: `arn:aws:lambda:location<aws_account_id>:function:<lambda_name>`

### CDK deployment order
- You can use `skillPackage.overrides` to patch your lambda function ARN into your skill package.
- Make sure to call `addDependency` on your skill instance.

### Skill Permissions
In order for Alexa to call the skill endpoint - i.e. the Lambda function - a resource based permission must be added to allow the Alexa Service Principal to call the function.
However, this would cause any Alexa Skill to be able to call the endpoint. Therefore, the skill-id should be added as a condition to the permission.

However, when deploying the skill, Alexa immediately checks if the skill endpoint is allowed to be accessed. At this point, we do not have a skill id to add to the resource based permission.

Therefore, this library includes a construct `SkillEndpointPermission`, which first creates a resource based permission that allows Alexa to call `invokeFunction` in general.

After the creation of the Skill, the Skill Id can be injected into the Permission. To do this, simply call the `configureSkillId` method on the `SkillEndpointPermission`.


### Example
Here's an example including the `skillPackage.overrides` and `SkillEndpointPermission`.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3Assets from 'aws-cdk-lib/aws-s3-assets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {Construct} from 'constructs';

import * as skill from 'cdk-skill-management';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const vendorParameter = ssm.StringParameter
      .fromStringParameterName(this, 'VendorIdParameter', 'my-skill-vendor-id');
    const skillCredentials = secretsmanager
      .Secret.fromSecretNameV2(this, 'SkillCredentials', 'my-skill-authentication');
    const asset = new s3Assets.Asset(this, 'SkillPackageAsset', {path: './path/to/my/skill-package'});

    const myFunction = new lambda.Function(this, 'MyEndpointFunction', {...});
    const endpointPermission = new skill.SkillEndpointPermission(this, 'EndpointPermission', {
      handler: myFunction
    });

    const mySkill = new skill.Skill(this, 'Skill', {
      skillType: skill.SkillType.SMART_HOME,
      skillStage: 'development',
      vendorId: vendorParameter.stringValue,
      authenticationConfiguration: {
        clientId: skillCredentials.secretValueFromJson('clientId').unsafeUnwrap(),
        clientSecret: skillCredentials.secretValueFromJson('clientSecret').unsafeUnwrap(),
        refreshToken: skillCredentials.secretValueFromJson('refreshToken').unsafeUnwrap(),
      },
      skillPackage: {
        asset,
        overrides: {
          manifest: {
            apis: {
              smartHome: {
                endpoint: {
                  uri: myFunction.functionArn
                }
              }
            }
          }
        }
      },
    });
    mySkill.addDependency(myFunction);
    mySkill.addDependency(endpointPermission);
    
    endpointPermission.configureSkillId(this, 'EndpointPermissionSkill', mySkill);
  }
}
```

## Contributing
We welcome contributions from the community. To contribute, please follow our [contribution guidelines](CONTRIBUTE.md).

## License
This library is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
