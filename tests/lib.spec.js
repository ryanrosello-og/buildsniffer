const lib = require('../lib')

describe('./lib.js', () => {
  describe('generateAuthToken()', () => {
    it('generates auth token', () => {        
      let result = lib.generateAuthToken('test', 'testaytvffgq5ssm5pnfffmut2hd6bsh3sz464dlomrhxh4jw2nq')
      expect(result).toEqual('Basic dGVzdDp0ZXN0YXl0dmZmZ3E1c3NtNXBuZmZmbXV0MmhkNmJzaDNzejQ2NGRsb21yaHhoNGp3Mm5x');
    });
  });

  describe('validateConfig(config)', () => {
    it('returns no errors when the tfs configuration valid', () => {        
      let appConfig = {
        pat: 'fdsdfsdytvvjgq5xxx5pn66pmut2hd6bsh3sz464dloffffh4jw2nq',
        username: 'autotest',
        pollInterval: 21000,
        failureThreshold: 10,
        tfsOrazure: 'tfs',
        tfs: {
          releaseDefinitionId: 881,
          environmentId: 111,
          instance: 'goolge',
          collection: 'internal',
          project: 'goth',
          apiVersion: '1.1'
        },
        azure: {
          organization: '',          
          project: '',
          apiVersion: ''
        }
      }

      let result = lib.validateConfig(appConfig)      
      expect(result.hasErrors).toEqual(false)
    });

    it('returns no errors when the azure configuration valid', () => {        
      let appConfig = {
        pat: 'fdsdfsdytvvjgq5xxx5pn66pmut2hd6bsh3sz464dloffffh4jw2nq',
        username: 'autotest',
        pollInterval: 21000,
        failureThreshold: 10,
        tfsOrazure: 'azure',
        tfs: {
          instance: '',
          collection: '',
          project: '',
          apiVersion: ''
        },
        azure: {
          organization: 'goolge',          
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.validateConfig(appConfig)      
      expect(result.hasErrors).toEqual(false)
    });    

    it('returns errors when mandatory keys are missing', () => {        
      let appConfig = {
        pat: '',
        username: '',
        pollInterval: null,
        failureThreshold: null,
        tfsOrazure: '',
        tfs: {
          instance: '',
          collection: '',
          project: '',
          apiVersion: ''
        },
        azure: {
          organization: 'goolge',          
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.validateConfig(appConfig)      
      expect(result.hasErrors).toEqual(true)
      expect(result.errors.length).toEqual(6)
    });    

    it('returns errors when invalid tfs configuration is supplied', () => {        
      let appConfig = {
        pat: 'fdsdfsdytvvjgq5xxx5pn66pmut2hd6bsh3sz464dloffffh4jw2nq',
        username: 'autotest',
        pollInterval: 21000,
        failureThreshold: 10,
        tfsOrazure: 'tfs',
        tfs: {
          instance: '',
          collection: '',
          project: '',
          apiVersion: ''
        },
        azure: {
          organization: 'goolge',          
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.validateConfig(appConfig)      
      expect(result.hasErrors).toEqual(true)
      expect(result.errors.length).toEqual(4)    
    });
    
    it('returns errors when invalid azure configuration is supplied', () => {        
      let appConfig = {
        pat: 'fdsdfsdytvvjgq5xxx5pn66pmut2hd6bsh3sz464dloffffh4jw2nq',
        username: 'autotest',
        pollInterval: 21000,
        failureThreshold: 10,
        tfsOrazure: 'azure',
        tfs: {
          instance: '',
          collection: '',
          project: '',
          apiVersion: ''
        },
        azure: {
          organization: '',          
          project: '',
          apiVersion: ''
        }
      }

      let result = lib.validateConfig(appConfig)      
      expect(result.hasErrors).toEqual(true)
      expect(result.errors.length).toEqual(3)        
    });    
  });  

  describe('getUrl(appConfig)', () => {
    it('generates valid request url for tfs', () => {        
      let appConfig = {
        tfsOrazure: 'tfs',
        tfs: {
          releaseDefinitionId: 881,
          environmentId: 111,
          instance: 'goolge',
          collection: 'internal',
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.getUrl(appConfig)
      expect(result).toEqual('https://goolge/internal/goth/_apis/release/deployments?api-version=1.1&ReleaseQueryOrder=descending&$top=1&definitionId=881&definitionEnvironmentId=111')
    });

    it('generates valid request url for tfs when no environment and releaseDefnId are provided', () => {        
      let appConfig = {
        tfsOrazure: 'tfs',
        tfs: {
          instance: 'goolge',
          collection: 'internal',
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.getUrl(appConfig)
      expect(result).toEqual('https://goolge/internal/goth/_apis/release/deployments?api-version=1.1&ReleaseQueryOrder=descending&$top=1')
    });

    it('generates valid request url for azure', () => {        
      let appConfig = {
        tfsOrazure: 'azure',
        azure: {
          releaseDefinitionId: 881,
          environmentId: 111,
          organization: 'goolge',          
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.getUrl(appConfig)
      expect(result).toEqual('https://vsrm.dev.azure.com/goolge/goth/_apis/release/deployments?api-version=1.1&ReleaseQueryOrder=descending&$top=1&definitionId=881&definitionEnvironmentId=111')      
    });    

    it('generates valid request url for azure when no environment and releaseDefnId are provided', () => {        
      let appConfig = {
        tfsOrazure: 'azure',
        azure: {
          organization: 'goolge',          
          project: 'goth',
          apiVersion: '1.1'
        }
      }

      let result = lib.getUrl(appConfig)
      expect(result).toEqual('https://vsrm.dev.azure.com/goolge/goth/_apis/release/deployments?api-version=1.1&ReleaseQueryOrder=descending&$top=1')      
    });       
  });  

  describe('parseResponse(data)', () => {
    it('parses releases that failed', () => {        
      let testData = {}
      testData = require('./bakedTestData.json')
      testData.value[0].deploymentStatus = 'failed'
      let result = lib.parseResponse(testData)

      expect(result.tooltip).toContain('❌ Release-3 completed')
      expect(result.toastMessage).toContain('Requested for: ry rose ')
      expect(result.icon).toEqual('img_fail.png')
      expect(result.msg).toContain('Release-3 completed')
      expect(result.releaseName).toEqual('Release-3')
      expect(result.deploymentStatus).toEqual('failed')
      expect(result.requestedFor).toContain('ry rose')
      expect(result.completedOn).toContain('completed')
      expect(result.releaseUrl).toEqual('https://dev.azure.com/autotest0326/f57a3cd6-c887-4871-be34-9beba1e2f48f/_release?releaseId=3&_a=release-summary')
    });

    it('parses releases that have passed', () => {  
      let testData = {}     
      testData = require('./bakedTestData.json')
      testData.value[0].deploymentStatus = 'succeeded'
      let result = lib.parseResponse(testData)

      expect(result.tooltip).toContain('✅ Release-3 completed')
      expect(result.toastMessage).toContain('Requested for: ry rose ')
      expect(result.icon).toEqual('img_pass.png')
      expect(result.msg).toContain('Release-3 completed')
      expect(result.releaseName).toEqual('Release-3')
      expect(result.deploymentStatus).toEqual('succeeded')
      expect(result.requestedFor).toContain('ry rose')
      expect(result.completedOn).toContain('completed')
      expect(result.releaseUrl).toEqual('https://dev.azure.com/autotest0326/f57a3cd6-c887-4871-be34-9beba1e2f48f/_release?releaseId=3&_a=release-summary')

    });
  });   
});