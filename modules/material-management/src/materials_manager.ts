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

import { Keyring, EncryptionRequest, DecryptionRequest } from '.' // eslint-disable-line no-unused-vars
import { EncryptionResponse, DecryptionResponse, SupportedAlgorithmSuites } from './types' // eslint-disable-line no-unused-vars
import { NodeAlgorithmSuite } from './node_algorithms' // eslint-disable-line no-unused-vars
import { WebCryptoAlgorithmSuite } from './web_crypto_algorithms' // eslint-disable-line no-unused-vars

/*
 * This public interface to the MaterialsManager object is provided for
 * developers of CMMs and keyrings only. If you are a user of the AWS Encryption
 * SDK and you are not developing your own CMMs and/or keyrings, you do not
 * need to use it and you should not do so.
 */

interface MaterialsManager<S extends SupportedAlgorithmSuites> {
  readonly keyring: Keyring<S>
  getEncryptionMaterials(request: EncryptionRequest<S>): Promise<EncryptionResponse<S>>
  decryptMaterials(request: DecryptionRequest<S>): Promise<DecryptionResponse<S>>
}

export interface NodeMaterialsManager extends MaterialsManager<NodeAlgorithmSuite> {}
export interface WebCryptoMaterialsManager extends MaterialsManager<WebCryptoAlgorithmSuite> {}
