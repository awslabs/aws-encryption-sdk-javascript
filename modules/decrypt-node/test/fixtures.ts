/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import {
  NodeDecryptionMaterial, // eslint-disable-line no-unused-vars
  NodeEncryptionMaterial, // eslint-disable-line no-unused-vars
  KeyringNode,
  KeyringTraceFlag
} from '@aws-crypto/material-management-node'

export function base64CiphertextAlgAes256GcmIv12Tag16HkdfSha384EcdsaP384 () {
  return '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'
}

export function invalidSignatureCiphertextAlgAes256GcmIv12Tag16HkdfSha384EcdsaP384 () {
  return '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'
}

export function base64Ciphertext4BytesWith4KFrameLength () {
  return 'AYADeEpqVoZzS6rBmbCKSa4acg4AXwABABVhd3MtY3J5cHRvLXB1YmxpYy1rZXkAREE4blREMk5rYzRDRXhoQTNlR0E3M1kyWWY2N2c4TDQySjlwL2UzNHo5RjdUR1hlT2pJZGR4TjEyeitUemk4Wmpxdz09AAEAAWsAAWsAAwAAAAIAAAAADAAAEAAAAAAAAAAAAAAAAABggOHpalFEq+ovk6c4Ugaj/////wAAAAEAAAAAAAAAAAAAAAEAAAAEDyVA5PCXHZo4sqQuqprmzWXwXUsAZzBlAjAY3vK9flPg8WEnoxIjPuhbj4o+bKUsJzbZgtDBaqIaBZYo8yt7JQB4vFyzb/PwucoCMQCz2fzhOQBAM63n56vBdIjBVqbNPyszIy0QjE8OJ/X8mV48VNi5wCF4u7I4MmK91N0='
}

export function base64Plaintext () {
  return '3Ye0RVTIjYp9Yvi+81Dzq9h9gAUF6akM1mqTbPKMhmwgxTWuj6Wlf8UFUMG7zALPDpN77EleMS3dXUOGlr/nalmwXkBseEo+QxCJgeo6WMuB2xQHZqJT+0glM3mcl2FWwiQDZ9G84dYOW1KSDfiyISe9rTqARl0fmEnD1oB6zlP4cYg7+DDTxOOvw5RndoiOBZ+mLbZT9vHTsJkWB3HgFO06dFAtwSgjUAEaNWMjk04vIT+9SBvql6cOk+GLfUdkH33chNk22yKPF2UQ6+lvW0YqGODIfTBQXypPuuKYXJ3T583YxeiKoxuxZFpVNkg30r5cYPOYulINy+YrWQIbNFRP9Zk0CNkAJ7zsIMhQ8IXH+zG1bQmwh1RDGSAfZhmsR147Jsi6qty9Fe9O'
}

export function encryptionContext () {
  return {
    'aws-crypto-public-key': 'AnYtFEewZm+28KhIGpx8RhkaUaLccJpyf1nwIVQFGmypgzhH2XdSIBJ4sKiSH3ckzw==',
    simple: 'context'
  }
}

export function basicFrameHeader () {
  return Buffer.from([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
}

export function frameSequenceOutOfOrder () {
  /* This is the string 'asdf' encrypted with ALG_AES128_GCM_IV12_TAG16.
   * The data key is all zeros.
   * The frames have been reordered in order to test decryption failure.
   */
  return 'AYAAFG/G0IFAKXNb9xuUlGZGldIAAAABAAFrAAFrAAMAAAACAAAAAAwAAAAB' + // header
  'AAAAAAAAAAAAAAAAslUUXWAiznTYc7fZwFSbDw' + // header auth
  'AAAAQAAAAAAAAAAAAAAAR9lLkID8B52uAln4zhh6ReJf' + // f
  'AAAAMAAAAAAAAAAAAAAAPnL7BJ22Xgjm6rneeNHrus9w' + // d
  'AAAAIAAAAAAAAAAAAAAAKiyryqy/AOiRH01aCOktajyw' + // s
  'AAAAEAAAAAAAAAAAAAAAEPhwHD/lPe6S/+QmqmQq+xXQ' // a
}

export function decryptKeyring () {
  class TestKeyring extends KeyringNode {
    async _onEncrypt () : Promise<NodeEncryptionMaterial> {
      throw new Error('I should never see this error')
    }
    async _onDecrypt (material: NodeDecryptionMaterial) {
      const unencryptedDataKey = new Uint8Array(material.suite.keyLengthBytes).fill(0)
      const trace = { keyNamespace: 'k', keyName: 'k', flags: KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY }
      return material.setUnencryptedDataKey(unencryptedDataKey, trace)
    }
  }

  return new TestKeyring()
}
