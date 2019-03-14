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

import {
  WebCryptoAlgorithmSuite, // eslint-disable-line no-unused-vars
  Keyring, MultiKeyring, immutableClass
} from '@aws-crypto/material-management'

export * from './browser_cryptographic_materials_manager'
export * from './material_helpers'
export * from './bytes2JWK'
export {
  WebCryptoDecryptionMaterial, WebCryptoEncryptionMaterial, WebCryptoAlgorithmSuite,
  AlgorithmSuiteIdentifier, EncryptionContext, EncryptedDataKey,
  KeyringTrace, KeyringTraceFlag, needs, MixedBackendCryptoKey,
  immutableBaseClass, immutableClass, frozenClass, readOnlyProperty
} from '@aws-crypto/material-management'

export abstract class WebCryptoKeyring extends Keyring<WebCryptoAlgorithmSuite> {}
export abstract class WebCryptoMultiKeyring extends MultiKeyring<WebCryptoAlgorithmSuite> {}
immutableClass(WebCryptoKeyring)
immutableClass(WebCryptoMultiKeyring)
