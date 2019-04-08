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

import {
  CachingMaterialsManager,
  decorateProperties,
  getEncryptionMaterials,
  decryptMaterials,
  cacheEntryHasExceededLimits,
  build,
  CachingMaterialsManagerInput,
  Cache
} from '@aws-crypto/cache-material'
import {
  MaterialsManager,
  NodeCryptographicMaterialsManager,
  NodeAlgorithmSuite,
  KeyringNode,
} from '@aws-crypto/material-management-node'

import {createHash} from 'crypto'

const fromUtf8 = (input: string) => Buffer.from(input, 'utf8')
const sha512Hex = async (...data: (Uint8Array|string)[]) => data
  .reduce((hash, item) => hash.update(item), createHash('sha512'))
  .digest('hex')

const buildCacheKey = build(fromUtf8, sha512Hex)

export class NodeCachingMaterialsManager implements CachingMaterialsManager<NodeAlgorithmSuite> {
  readonly _cache!: Cache<NodeAlgorithmSuite>
  readonly _backingMaterialsManager!: MaterialsManager<NodeAlgorithmSuite>
  readonly _partition!: string
  readonly _maxBytesEncrypted!: number
  readonly _maxMessagesEncrypted!: number
  readonly _maxAge?: number

  constructor(input: CachingMaterialsManagerInput<NodeAlgorithmSuite>) {
    const backingMaterialsManager = input.backingMaterials instanceof KeyringNode
      ? new NodeCryptographicMaterialsManager(input.backingMaterials)
      : <NodeCryptographicMaterialsManager>input.backingMaterials
      
    decorateProperties(this, {backingMaterialsManager, ...input})
  }

  getEncryptionMaterials = getEncryptionMaterials<NodeAlgorithmSuite>(buildCacheKey)
  decryptMaterials = decryptMaterials<NodeAlgorithmSuite>(buildCacheKey)
  _cacheEntryHasExceededLimits = cacheEntryHasExceededLimits<NodeAlgorithmSuite>()
}
