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

import { MixedBackendCryptoKey, SupportedAlgorithmSuites } from './types' // eslint-disable-line no-unused-vars
import { EncryptedDataKey } from './encrypted_data_key'
import { SignatureKey, VerificationKey } from './signature_key'
import { frozenClass, readOnlyProperty } from './immutable_class'
import { KeyringTrace, KeyringTraceFlag } from './keyring_trace' // eslint-disable-line no-unused-vars
import { NodeAlgorithmSuite } from './node_algorithms'
import { WebCryptoAlgorithmSuite } from './web_crypto_algorithms'
import { needs } from './needs'

/*
 * This public interface to the CryptographicMaterial object is provided for
 * developers of CMMs and keyrings only. If you are a user of the AWS Encryption
 * SDK and you are not developing your own CMMs and/or keyrings, you do not
 * need to use it and you should not do so.
 *
 * The CryptographicMaterial's purpose is to bind together all the required elements for
 * encrypting or decrypting a payload.
 * The functional data key (unencrypted or CryptoKey) is the most sensitive data and needs to
 * be protected.  The longer this data persists in memory the
 * greater the opportunity to be invalidated.  Because
 * a Caching CMM exists is it important to insure that the
 * unencrypted data key and it's meta data can not be manipulated,
 * and that the unencrypted data key can be zeroed when
 * it is no longer needed.
 */

export interface FunctionalCryptographicMaterial {
  hasValidKey: () => boolean
}

export interface CryptographicMaterial<T extends CryptographicMaterial<T>> {
  suite: SupportedAlgorithmSuites
  setUnencryptedDataKey: (dataKey: Uint8Array, trace: KeyringTrace) => T
  getUnencryptedDataKey: () => Uint8Array
  zeroUnencryptedDataKey: () => T
  hasUnencryptedDataKey: boolean
  unencryptedDataKeyLength: number
  keyringTrace: KeyringTrace[]
}

export interface EncryptionMaterial<T extends CryptographicMaterial<T>> extends CryptographicMaterial<T> {
  encryptedDataKeys: EncryptedDataKey[]
  addEncryptedDataKey: (edk: EncryptedDataKey, flags: KeyringTraceFlag) => T
  setSignatureKey: (key: SignatureKey) => T
  signatureKey?: SignatureKey
}

export interface DecryptionMaterial<T extends CryptographicMaterial<T>> extends CryptographicMaterial<T> {
  setVerificationKey: (key: VerificationKey) => T
  verificationKey?: VerificationKey
}

export interface WebCryptoMaterial<T extends CryptographicMaterial<T>> extends CryptographicMaterial<T> {
  setCryptoKey: (dataKey: CryptoKey|MixedBackendCryptoKey) => T
  getCryptoKey: () => CryptoKey|MixedBackendCryptoKey
  hasCryptoKey: boolean
}

export class NodeEncryptionMaterial implements
  Readonly<EncryptionMaterial<NodeEncryptionMaterial>>,
  FunctionalCryptographicMaterial {
  suite: NodeAlgorithmSuite
  setUnencryptedDataKey!: (dataKey: Uint8Array, trace: KeyringTrace) => NodeEncryptionMaterial
  getUnencryptedDataKey!: () => Uint8Array
  zeroUnencryptedDataKey!: () => NodeEncryptionMaterial
  hasUnencryptedDataKey!: boolean
  unencryptedDataKeyLength!: number
  keyringTrace: KeyringTrace[] = []
  encryptedDataKeys!: EncryptedDataKey[]
  addEncryptedDataKey!: (edk: EncryptedDataKey, flags: KeyringTraceFlag) => NodeEncryptionMaterial
  setSignatureKey!: (key: SignatureKey) => NodeEncryptionMaterial
  signatureKey?: SignatureKey
  constructor (suite: NodeAlgorithmSuite) {
    /* Precondition: suite is NodeAlgorithmSuite */
    needs(suite instanceof NodeAlgorithmSuite, 'Suite must be a NodeAlgorithmSuite')
    this.suite = suite
    // EncryptionMaterial have generated a data key on setUnencryptedDataKey
    decorateCryptographicMaterial<NodeEncryptionMaterial>(this, KeyringTraceFlag.WRAPPING_KEY_GENERATED_DATA_KEY)
    decorateEncryptionMaterial<NodeEncryptionMaterial>(this)
    Object.setPrototypeOf(this, NodeEncryptionMaterial.prototype)
    Object.freeze(this)
  }
  hasValidKey () {
    return this.hasUnencryptedDataKey
  }
}
frozenClass(NodeEncryptionMaterial)

export class NodeDecryptionMaterial implements
  Readonly<DecryptionMaterial<NodeDecryptionMaterial>>,
  FunctionalCryptographicMaterial {
  suite: NodeAlgorithmSuite
  setUnencryptedDataKey!: (dataKey: Uint8Array, trace: KeyringTrace) => NodeDecryptionMaterial
  getUnencryptedDataKey!: () => Uint8Array
  zeroUnencryptedDataKey!: () => NodeDecryptionMaterial
  hasUnencryptedDataKey!: boolean
  unencryptedDataKeyLength!: number
  keyringTrace: KeyringTrace[] = []
  setVerificationKey!: (key: VerificationKey) => NodeDecryptionMaterial
  verificationKey?: VerificationKey
  constructor (suite: NodeAlgorithmSuite) {
    /* Precondition: suite is NodeAlgorithmSuite */
    needs(suite instanceof NodeAlgorithmSuite, 'Suite must be a NodeAlgorithmSuite')
    this.suite = suite
    // DecryptionMaterial have decrypted a data key on setUnencryptedDataKey
    decorateCryptographicMaterial<NodeDecryptionMaterial>(this, KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY)
    decorateDecryptionMaterial<NodeDecryptionMaterial>(this)
    Object.setPrototypeOf(this, NodeDecryptionMaterial.prototype)
    Object.freeze(this)
  }
  hasValidKey () {
    return this.hasUnencryptedDataKey
  }
}
frozenClass(NodeDecryptionMaterial)

export class WebCryptoEncryptionMaterial implements
  Readonly<EncryptionMaterial<WebCryptoEncryptionMaterial>>,
  Readonly<WebCryptoMaterial<WebCryptoEncryptionMaterial>>,
  FunctionalCryptographicMaterial {
  suite: WebCryptoAlgorithmSuite
  setUnencryptedDataKey!: (dataKey: Uint8Array, trace: KeyringTrace) => WebCryptoEncryptionMaterial
  getUnencryptedDataKey!: () => Uint8Array
  zeroUnencryptedDataKey!: () => WebCryptoEncryptionMaterial
  hasUnencryptedDataKey!: boolean
  unencryptedDataKeyLength!: number
  keyringTrace: KeyringTrace[] = []
  encryptedDataKeys!: EncryptedDataKey[]
  addEncryptedDataKey!: (edk: EncryptedDataKey, flags: KeyringTraceFlag) => WebCryptoEncryptionMaterial
  setSignatureKey!: (key: SignatureKey) => WebCryptoEncryptionMaterial
  signatureKey?: SignatureKey
  setCryptoKey!: (dataKey: CryptoKey|MixedBackendCryptoKey) => WebCryptoEncryptionMaterial
  getCryptoKey!: () => CryptoKey|MixedBackendCryptoKey
  hasCryptoKey!: boolean
  constructor (suite: WebCryptoAlgorithmSuite) {
    /* Precondition: suite is WebCryptoAlgorithmSuite */
    needs(suite instanceof WebCryptoAlgorithmSuite, 'Suite must be a WebCryptoAlgorithmSuite')
    this.suite = suite
    // EncryptionMaterial have generated a data key on setUnencryptedDataKey
    decorateCryptographicMaterial<WebCryptoEncryptionMaterial>(this, KeyringTraceFlag.WRAPPING_KEY_GENERATED_DATA_KEY)
    decorateEncryptionMaterial<WebCryptoEncryptionMaterial>(this)
    decorateWebCryptoMaterial<WebCryptoEncryptionMaterial>(this)
    Object.setPrototypeOf(this, WebCryptoEncryptionMaterial.prototype)
    Object.freeze(this)
  }
  hasValidKey () {
    return this.hasUnencryptedDataKey && this.hasCryptoKey
  }
}
frozenClass(WebCryptoEncryptionMaterial)

export class WebCryptoDecryptionMaterial implements
  Readonly<DecryptionMaterial<WebCryptoDecryptionMaterial>>,
  Readonly<WebCryptoMaterial<WebCryptoDecryptionMaterial>>,
  FunctionalCryptographicMaterial {
  suite: WebCryptoAlgorithmSuite
  setUnencryptedDataKey!: (dataKey: Uint8Array, trace: KeyringTrace) => WebCryptoDecryptionMaterial
  getUnencryptedDataKey!: () => Uint8Array
  zeroUnencryptedDataKey!: () => WebCryptoDecryptionMaterial
  hasUnencryptedDataKey!: boolean
  unencryptedDataKeyLength!: number
  keyringTrace: KeyringTrace[] = []
  setVerificationKey!: (key: VerificationKey) => WebCryptoDecryptionMaterial
  verificationKey?: VerificationKey
  setCryptoKey!: (dataKey: CryptoKey|MixedBackendCryptoKey) => WebCryptoDecryptionMaterial
  getCryptoKey!: () => CryptoKey|MixedBackendCryptoKey
  hasCryptoKey!: boolean
  constructor (suite: WebCryptoAlgorithmSuite) {
    /* Precondition: suite is WebCryptoAlgorithmSuite */
    needs(suite instanceof WebCryptoAlgorithmSuite, 'Suite must be a WebCryptoAlgorithmSuite')
    this.suite = suite
    // DecryptionMaterial have decrypted a data key on setUnencryptedDataKey
    decorateCryptographicMaterial<WebCryptoDecryptionMaterial>(this, KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY)
    decorateDecryptionMaterial<WebCryptoDecryptionMaterial>(this)
    decorateWebCryptoMaterial<WebCryptoDecryptionMaterial>(this)
    Object.setPrototypeOf(this, WebCryptoDecryptionMaterial.prototype)
    Object.freeze(this)
  }
  hasValidKey () {
    return this.hasCryptoKey
  }
}
frozenClass(WebCryptoDecryptionMaterial)

export function isEncryptionMaterial (obj: any): obj is WebCryptoEncryptionMaterial|NodeEncryptionMaterial {
  return (obj instanceof WebCryptoEncryptionMaterial) || (obj instanceof NodeEncryptionMaterial)
}

export function isDecryptionMaterial (obj: any): obj is WebCryptoDecryptionMaterial|NodeDecryptionMaterial {
  return (obj instanceof WebCryptoDecryptionMaterial) || (obj instanceof NodeDecryptionMaterial)
}

export function decorateCryptographicMaterial<T extends CryptographicMaterial<T>> (material: T, setFlags: KeyringTraceFlag) {
  let unencryptedDataKeyZeroed = false
  let unencryptedDataKey: Uint8Array
  // This copy of the unencryptedDataKey is stored to insure that the
  // unencrypted data key is *never* modified.  Since the
  // unencryptedDataKey is returned by reference, any change
  // to it would be propagated to any cached versions.
  let udkForVerification: Uint8Array

  const setUnencryptedDataKey = (dataKey: Uint8Array, trace: KeyringTrace) => {
    /* Precondition: unencryptedDataKey must not be set.  Modifying the unencryptedDataKey is denied */
    needs(!unencryptedDataKey, 'unencryptedDataKey has already been set')
    /* Precondition: dataKey must be Binary Data */
    needs(dataKey instanceof Uint8Array, 'dataKey must be a Uint8Array')
    /* Precondition: The data key's length must agree with algorithm specification.
     * If this is not the case, it either means ciphertext was tampered
     * with or the keyring implementation is not setting the length properly.
     */
    needs(dataKey.byteLength === material.suite.keyLengthBytes, 'Key length does not agree with the algorithm specification.')

    /* Precondition: Trace must be set, and the flag must indicate that the data key was generated. */
    needs(trace && trace.keyName && trace.keyNamespace, 'Malformed KeyringTrace')
    /* Precondition: On set the required KeyringTraceFlag must be set. */
    needs(trace.flags & setFlags, 'Required KeyringTraceFlag not set')
    material.keyringTrace.push(trace)

    unencryptedDataKey = dataKey
    udkForVerification = new Uint8Array(dataKey)

    return material
  }
  const getUnencryptedDataKey = (): Uint8Array => {
    /* Precondition: unencryptedDataKey must be set before we can return it. */
    needs(unencryptedDataKey, 'unencryptedDataKey has not been set')
    /* Precondition: unencryptedDataKey must not be Zeroed out.
     * Returning a null key would be incredibly bad.
     */
    needs(!unencryptedDataKeyZeroed, 'unencryptedDataKey has been zeroed.')
    /* Precondition: The unencryptedDataKey must not have been modified. */
    needs(udkForVerification.every((v, i) => unencryptedDataKey[i] === v), 'unencryptedDataKey has been corrupted.')
    return unencryptedDataKey
  }
  Object.defineProperty(material, 'hasUnencryptedDataKey', {
    // Check that we have both not zeroed AND that we have not set
    get: () => !!unencryptedDataKey && !unencryptedDataKeyZeroed,
    enumerable: true
  })
  const zeroUnencryptedDataKey = () => {
    /* Precondition: The unencryptedDataKey must be set to be zeroed. */
    needs(unencryptedDataKey, 'No unencryptedDataKey to zero.')
    unencryptedDataKey.fill(0)
    udkForVerification.fill(0)
    unencryptedDataKeyZeroed = true
    return material
  }
  Object.defineProperty(material, 'unencryptedDataKeyLength', {
    get: () => {
      /* Precondition: The unencryptedDataKey must be set to have a length. */
      needs(unencryptedDataKey, 'unencryptedDataKey has not been set')
      /* Precondition: the unencryptedDataKey must not be Zeroed out.
       * returning information about the data key,
       * while not the worst thing may indicate misuse.
       * Checking the algorithm specification is the proper way
       * to do this
       */
      needs(!unencryptedDataKeyZeroed, 'unencryptedDataKey has been zeroed.')
      return unencryptedDataKey.byteLength
    },
    enumerable: true
  })

  readOnlyProperty<T, 'setUnencryptedDataKey'>(material, 'setUnencryptedDataKey', setUnencryptedDataKey)
  readOnlyProperty<T, 'getUnencryptedDataKey'>(material, 'getUnencryptedDataKey', getUnencryptedDataKey)
  readOnlyProperty<T, 'zeroUnencryptedDataKey'>(material, 'zeroUnencryptedDataKey', zeroUnencryptedDataKey)

  return material
}

export function decorateEncryptionMaterial<T extends EncryptionMaterial<T>> (material: T) {
  const encryptedDataKeys: EncryptedDataKey[] = []
  let signatureKey: Readonly<SignatureKey>|undefined

  const addEncryptedDataKey = (edk: EncryptedDataKey, flags: KeyringTraceFlag) => {
    /* Precondition: If a data key has not already been generated, there must be no EDKs.
     * Pushing EDKs on the list before the data key has been generated may cause the list of
     * EDKs to be inconsistent. (i.e., they would decrypt to different data keys.)
     */
    needs(material.hasUnencryptedDataKey, 'Unencrypted data key not set.')
    /* Precondition: Edk must be EncryptedDataKey
     * Putting things onto the list that are not EncryptedDataKey
     * may cause the list of EDKs to be inconsistent. (i.e. they may not serialize, or be mutable)
     */
    needs(edk instanceof EncryptedDataKey, 'Unsupported instance of encryptedDataKey')

    /* Precondition: flags must indicate that the key was encrypted. */
    needs(flags & KeyringTraceFlag.WRAPPING_KEY_ENCRYPTED_DATA_KEY, 'Encrypted data key flag must be set.')
    /* When the unencrypted data key is first set, a given wrapping key may or may not also encrypt that key.
     * This means that the first EDK that is added may already have a trace.
     * The flags for the EDK and the existing trace should be merged iif this is the first EDK
     * and the only existing trace corresponds to this EDK.
     */
    if (firstEdkAndTraceMatch(encryptedDataKeys, material.keyringTrace, edk)) {
      material.keyringTrace[0].flags |= flags
    } else {
      material.keyringTrace.push({ keyName: edk.providerInfo, keyNamespace: edk.providerId, flags })
    }

    encryptedDataKeys.push(edk)
    return material
  }

  readOnlyProperty<T, 'addEncryptedDataKey'>(material, 'addEncryptedDataKey', addEncryptedDataKey)
  Object.defineProperty(material, 'encryptedDataKeys', {
    // I only want EDKs added through addEncryptedDataKey
    // so I return a new array
    get: () => [...encryptedDataKeys],
    enumerable: true
  })
  const setSignatureKey = (key: SignatureKey) => {
    /* Precondition: The SignatureKey stored must agree with the algorithm specification.
     * If this is not the case it means the MaterialManager or Keyring is not setting
     * the SignatureKey correctly
     */
    needs(material.suite.signatureCurve, 'Algorithm specification does not support signatures.')
    /* Precondition: signatureKey must not be set.  Modifying the signatureKey is denied. */
    needs(!signatureKey, 'Signature key has already been set.')
    /* Precondition: key must be a SignatureKey. */
    needs(key instanceof SignatureKey, 'Unsupported instance of key')
    signatureKey = key
    return material
  }
  readOnlyProperty<T, 'setSignatureKey'>(material, 'setSignatureKey', setSignatureKey)
  Object.defineProperty(material, 'signatureKey', {
    get: () => {
      /* Precondition: The SignatureKey requested must agree with the algorithm specification.
       * If this is not the case it means the MaterialManager or Keyring is not setting
       * the SignatureKey correctly
       */
      needs(!!material.suite.signatureCurve === !!signatureKey, 'Algorithm specification not satisfied.')
      return signatureKey
    },
    enumerable: true
  })

  return material
}

/* Verify that the this is the first EDK and that it matches the 1 and only 1 trace. */
function firstEdkAndTraceMatch (edks: EncryptedDataKey[], traces: KeyringTrace[], edk: EncryptedDataKey) {
  return edks.length === 0 &&
  traces.length === 1 &&
  edk.providerId === traces[0].keyNamespace &&
  edk.providerInfo === traces[0].keyName
}

export function decorateDecryptionMaterial<T extends DecryptionMaterial<T>> (material: T) {
  // Verification Key
  let verificationKey: Readonly<VerificationKey>|undefined
  const setVerificationKey = (key: VerificationKey) => {
    /* Precondition: The VerificationKey stored must agree with the algorithm specification.
     * If this is not the case it means the MaterialManager or Keyring is not setting
     * the VerificationKey correctly
     */
    needs(material.suite.signatureCurve, 'Algorithm specification does not support signatures.')
    /* Precondition: verificationKey must not be set.  Modifying the verificationKey is denied. */
    needs(!verificationKey, 'Verification key has already been set.')
    /* Precondition: key must be a VerificationKey. */
    needs(key instanceof VerificationKey, 'Unsupported instance of key')
    verificationKey = key
    return material
  }
  readOnlyProperty<T, 'setVerificationKey'>(material, 'setVerificationKey', setVerificationKey)
  Object.defineProperty(material, 'verificationKey', {
    get: () => {
      /* Precondition: The VerificationKey requested must agree with the algorithm specification.
       * If this is not the case it means the MaterialManager or Keyring is not setting
       * the VerificationKey correctly
       */
      needs(!!material.suite.signatureCurve === !!verificationKey, 'Algorithm specification not satisfied.')
      return verificationKey
    },
    enumerable: true
  })

  return material
}

export function decorateWebCryptoMaterial<T extends WebCryptoMaterial<T>> (material: T) {
  let cryptoKey: Readonly<CryptoKey|MixedBackendCryptoKey>|undefined

  type PluckStructure = [false|CryptoKey['usages'], false|WebCryptoAlgorithmSuite]
  /* To validate the CryptoKey I need the algorithm suite specification
   * and a list of valid usages, either `encrypt`|`decrypt` depending on material and
   * `deriveKey`, in the case of a KDF.
   */
  const [ validUsages, suite ]: PluckStructure = material instanceof WebCryptoEncryptionMaterial
    ? [['encrypt', 'deriveKey'], material.suite]
    : material instanceof WebCryptoDecryptionMaterial
      ? [['decrypt', 'deriveKey'], material.suite]
      : [false, false]

  if (!validUsages || !suite) throw new Error('')

  const setCryptoKey = (dataKey: CryptoKey|MixedBackendCryptoKey) => {
    /* Precondition: cryptoKey must not be set.  Modifying the cryptoKey is denied */
    needs(!cryptoKey, 'cryptoKey is already set.')
    /* Precondition: dataKey must be a supported type. */
    needs(isCryptoKey(dataKey) || isMixedBackendCryptoKey(dataKey), 'Unsupported dataKey type.')
    /* Precondition: The CryptoKey must match the algorithm suite specification. */
    needs(isValidCryptoKey(validUsages, dataKey, suite), 'CryptoKey settings not acceptable.')

    if (isCryptoKey(dataKey)) {
      cryptoKey = dataKey
    } else {
      const { zeroByteCryptoKey, nonZeroByteCryptoKey } = dataKey
      cryptoKey = Object.freeze({ zeroByteCryptoKey, nonZeroByteCryptoKey })
    }

    return material
  }

  readOnlyProperty<T, 'setCryptoKey'>(material, 'setCryptoKey', setCryptoKey)
  Object.defineProperty(material, 'cryptoKey', {
    get: () => {
      /* Precondition: The cryptoKey must be set before we can return it. */
      needs(cryptoKey, 'Crypto key is not set.')
      // In the case of MixedBackendCryptoKey the object
      // has already been frozen above so it is safe to return
      return cryptoKey
    },
    enumerable: true
  })
  Object.defineProperty(material, 'hasCryptoKey', {
    get: () => !!cryptoKey,
    enumerable: true
  })

  return material
}

function isCryptoKey (dataKey: any): dataKey is CryptoKey {
  return dataKey && !!dataKey.algorithm
}

function isValidCryptoKey (
  validUsages: CryptoKey['usages'],
  dataKey: CryptoKey|MixedBackendCryptoKey,
  suite: WebCryptoAlgorithmSuite
) : boolean {
  if (!isCryptoKey(dataKey)) {
    const { zeroByteCryptoKey, nonZeroByteCryptoKey } = dataKey
    return isValidCryptoKey(validUsages, zeroByteCryptoKey, suite) &&
      isValidCryptoKey(validUsages, nonZeroByteCryptoKey, suite)
  }

  const { encryption, keyLength } = suite

  /* See:
   * https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey
   * https://developer.mozilla.org/en-US/docs/Web/API/AesKeyGenParams
   */

  // Only symmetric algorithms
  return dataKey.type === 'secret' &&
    // Must match the suite
    dataKey.algorithm.name === encryption &&
    // @ts-ignore Must match the length
    dataKey.algorithm.length === keyLength &&
    // I do the work to make only 1 usage work, least privilege
    dataKey.usages.length === 1 &&
    // The only usage must be valid: encrypt|decrypt|deriveKey
    validUsages.includes(dataKey.usages[0]) &&
    // Since CryptoKey can not be zeroized, not extractable is the next best thing
    !dataKey.extractable
}

function isMixedBackendCryptoKey (dataKey: any): dataKey is MixedBackendCryptoKey {
  const { zeroByteCryptoKey, nonZeroByteCryptoKey } = dataKey
  return isCryptoKey(zeroByteCryptoKey) && isCryptoKey(nonZeroByteCryptoKey)
}
