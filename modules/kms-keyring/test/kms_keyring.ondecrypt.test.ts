/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use
 * this file except in compliance with the License. A copy of the License is
 * located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-env mocha */

import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import 'mocha'
import { KmsKeyring } from '../src/kms_keyring'
import { NodeAlgorithmSuite, AlgorithmSuiteIdentifier, KeyringTraceFlag, NodeDecryptionMaterial, EncryptedDataKey } from '@aws-crypto/material-management'
import { KMS } from '../src/kms_types/KMS' // eslint-disable-line no-unused-vars
import { DecryptInput } from '../src/kms_types/DecryptInput' // eslint-disable-line no-unused-vars
chai.use(chaiAsPromised)
const { expect } = chai

describe('KmsKeyring: _onDecrypt', () => {
  it('returns material', async () => {
    const generatorKmsKey = 'arn:aws:kms:us-east-1:123456789012:alias/example-alias'
    const encryptKmsKey = 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
    const kmsKeys = [encryptKmsKey]
    const context = { some: 'context' }
    const grantTokens = 'grant'
    const suite = new NodeAlgorithmSuite(AlgorithmSuiteIdentifier.ALG_AES128_GCM_IV12_TAG16)

    const clientProvider: any = () => {
      return { decrypt }
      function decrypt ({ CiphertextBlob, EncryptionContext, GrantTokens }: DecryptInput) {
        expect(EncryptionContext === context).to.equal(true)
        expect(GrantTokens).to.equal(grantTokens)
        return {
          Plaintext: new Uint8Array(suite.keyLengthBytes),
          KeyId: Buffer.from(<Uint8Array>CiphertextBlob).toString('utf8')
        }
      }
    }
    class TestKmsKeyring extends KmsKeyring<NodeAlgorithmSuite, KMS> {}

    const testKeyring = new TestKmsKeyring({
      clientProvider,
      generatorKmsKey,
      kmsKeys,
      grantTokens
    })

    const edk = new EncryptedDataKey({
      providerId: 'aws-kms',
      providerInfo: generatorKmsKey,
      encryptedDataKey: Buffer.from(generatorKmsKey)
    })

    const material = await testKeyring.onDecrypt(
      new NodeDecryptionMaterial(suite),
      [edk],
      context
    )

    expect(material.hasUnencryptedDataKey).to.equal(true)

    expect(material.keyringTrace).to.have.lengthOf(1)
    const [traceDecrypt] = material.keyringTrace
    expect(traceDecrypt.keyNamespace).to.equal('aws-kms')
    expect(traceDecrypt.keyName).to.equal(generatorKmsKey)
    expect(traceDecrypt.flags & KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY).to.equal(KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY)
    expect(traceDecrypt.flags & KeyringTraceFlag.WRAPPING_KEY_VERIFIED_ENC_CTX).to.equal(KeyringTraceFlag.WRAPPING_KEY_VERIFIED_ENC_CTX)
  })

  it('discovery keyring should return material', async () => {
    const generatorKmsKey = 'arn:aws:kms:us-east-1:123456789012:alias/example-alias'
    const context = { some: 'context' }
    const grantTokens = 'grant'
    const suite = new NodeAlgorithmSuite(AlgorithmSuiteIdentifier.ALG_AES128_GCM_IV12_TAG16)

    const clientProvider: any = () => {
      return { decrypt }
      function decrypt ({ CiphertextBlob, EncryptionContext, GrantTokens }: DecryptInput) {
        expect(EncryptionContext === context).to.equal(true)
        expect(GrantTokens).to.equal(grantTokens)
        return {
          Plaintext: new Uint8Array(suite.keyLengthBytes),
          KeyId: Buffer.from(<Uint8Array>CiphertextBlob).toString('utf8')
        }
      }
    }
    class TestKmsKeyring extends KmsKeyring<NodeAlgorithmSuite, KMS> {}

    const testKeyring = new TestKmsKeyring({
      clientProvider,
      grantTokens
    })

    const edk = new EncryptedDataKey({
      providerId: 'aws-kms',
      providerInfo: generatorKmsKey,
      encryptedDataKey: Buffer.from(generatorKmsKey)
    })

    const material = await testKeyring.onDecrypt(
      new NodeDecryptionMaterial(suite),
      [edk],
      context
    )

    expect(material.hasUnencryptedDataKey).to.equal(true)

    expect(material.keyringTrace).to.have.lengthOf(1)
    const [traceDecrypt] = material.keyringTrace
    expect(traceDecrypt.keyNamespace).to.equal('aws-kms')
    expect(traceDecrypt.keyName).to.equal(generatorKmsKey)
    expect(traceDecrypt.flags & KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY).to.equal(KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY)
    expect(traceDecrypt.flags & KeyringTraceFlag.WRAPPING_KEY_VERIFIED_ENC_CTX).to.equal(KeyringTraceFlag.WRAPPING_KEY_VERIFIED_ENC_CTX)
  })

  it('decrypt errors should not halt', async () => {
    const generatorKmsKey = 'arn:aws:kms:us-east-1:123456789012:alias/example-alias'
    const context = { some: 'context' }
    const grantTokens = 'grant'
    const suite = new NodeAlgorithmSuite(AlgorithmSuiteIdentifier.ALG_AES128_GCM_IV12_TAG16)

    const clientProvider: any = () => {
      return { decrypt }
      function decrypt () {
        throw new Error('failed to decrypt')
      }
    }
    class TestKmsKeyring extends KmsKeyring<NodeAlgorithmSuite, KMS> {}

    const testKeyring = new TestKmsKeyring({
      clientProvider,
      grantTokens
    })

    const edk = new EncryptedDataKey({
      providerId: 'aws-kms',
      providerInfo: generatorKmsKey,
      encryptedDataKey: Buffer.from(generatorKmsKey)
    })

    const material = await testKeyring.onDecrypt(
      new NodeDecryptionMaterial(suite),
      [edk],
      context
    )

    expect(material.hasUnencryptedDataKey).to.equal(false)
    expect(material.keyringTrace).to.have.lengthOf(0)
  })
})
