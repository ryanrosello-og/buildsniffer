const lib = require('../lib')

describe('./lib.js', () => {
  describe('generateAuthToken()', () => {
    it('generates auth token', () => {        
      let result = lib.generateAuthToken('test', 'testaytvffgq5ssm5pnfffmut2hd6bsh3sz464dlomrhxh4jw2nq')
      expect(result).toEqual('Basic dGVzdDp0ZXN0YXl0dmZmZ3E1c3NtNXBuZmZmbXV0MmhkNmJzaDNzejQ2NGRsb21yaHhoNGp3Mm5x');
    });
  });

  describe('getUrl(appConfig)', () => {
    it('generates valid request url for tfs', () => {        
      let appConfig = {
        tfsOrAzure: 'tfs',
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
        tfsOrAzure: 'tfs',
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
        tfsOrAzure: 'azure',
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
        tfsOrAzure: 'azure',
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
      expect(result).toEqual({
        tooltip: '❌ Release-3 completed a year ago',
        toastMessage: 'refs/heads/develop requested for: ry rose ',
        icon: 'img_fail.png',
        msg: 'Release-3 completed a year ago',
        releaseName: 'Release-3',
        deploymentStatus: 'failed',
        requestedFor: 'ry rose',
        completedOn: 'completed a year ago',
        releaseUrl: 'https://dev.azure.com/autotest0326/f57a3cd6-c887-4871-be34-9beba1e2f48f/_release?releaseId=3&_a=release-summary'
      })      
    });

    it('parses releases that have passed', () => {  
      let testData = {}     
      testData = require('./bakedTestData.json')
      testData.value[0].deploymentStatus = 'succeeded'
      let result = lib.parseResponse(testData)
      expect(result).toEqual({
        tooltip: '✅ Release-3 completed a year ago',
        toastMessage: 'refs/heads/develop requested for: ry rose ',
        icon: 'img_pass.png',
        msg: 'Release-3 completed a year ago',
        releaseName: 'Release-3',
        deploymentStatus: 'succeeded',
        requestedFor: 'ry rose',
        completedOn: 'completed a year ago',
        releaseUrl: 'https://dev.azure.com/autotest0326/f57a3cd6-c887-4871-be34-9beba1e2f48f/_release?releaseId=3&_a=release-summary'
      })  
    });

    it('parses releases that currently in progress', () => {    
      let testData = {}    
      testData = require('./bakedTestData.json')
      testData.value[0].deploymentStatus = 'inprogress'
      testData.value[0].completedOn = '0001-01-01T00:00:00'
      let result = lib.parseResponse(testData)
      expect(result).toEqual({
        tooltip: 'ᕕ(ᐛ)ᕗ Release-3 ',
        toastMessage: 'refs/heads/develop requested for: ry rose ',
        icon: 'img_icons8-final-state-40.png',
        msg: 'Release-3 ',
        releaseName: 'Release-3',
        deploymentStatus: 'inprogress',
        requestedFor: 'ry rose',
        completedOn: '',
        releaseUrl: 'https://dev.azure.com/autotest0326/f57a3cd6-c887-4871-be34-9beba1e2f48f/_release?releaseId=3&_a=release-summary'
      })  
    });    
  });   
});