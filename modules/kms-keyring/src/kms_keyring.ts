// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KmsClientSupplier } from './kms_client_supplier'
import { AwsEsdkKMSInterface, RequiredDecryptResponse } from './kms_types'
import {
  needs,
  Keyring,
  EncryptionMaterial,
  DecryptionMaterial,
  SupportedAlgorithmSuites,
  KeyringTrace,
  KeyringTraceFlag,
  EncryptedDataKey,
  immutableClass,
  readOnlyProperty,
  unwrapDataKey,
} from '@aws-crypto/material-management'
import {
  KMS_PROVIDER_ID,
  generateDataKey,
  encrypt,
  decrypt,
  kmsResponseToEncryptedDataKey,
} from './helpers'
import {
  regionFromKmsKeyArn,
  decomposeAwsKmsKeyArn,
} from './region_from_kms_key_arn'

export interface KmsKeyringInput<Client extends AwsEsdkKMSInterface> {
  clientProvider: KmsClientSupplier<Client>
  keyIds?: string[]
  generatorKeyId?: string
  grantTokens?: string[]
  discovery?: boolean
  discoveryFilter?: {
    accountIDs: string[]
    partition: string
  }
}

export interface KeyRing<
  S extends SupportedAlgorithmSuites,
  Client extends AwsEsdkKMSInterface
> extends Keyring<S> {
  keyIds: ReadonlyArray<string>
  generatorKeyId?: string
  clientProvider: KmsClientSupplier<Client>
  grantTokens?: string[]
  isDiscovery: boolean
  discoveryFilter?: Readonly<{
    accountIDs: readonly string[]
    partition: string
  }>
  _onEncrypt(material: EncryptionMaterial<S>): Promise<EncryptionMaterial<S>>
  _onDecrypt(
    material: DecryptionMaterial<S>,
    encryptedDataKeys: EncryptedDataKey[]
  ): Promise<DecryptionMaterial<S>>
}

export interface KmsKeyRingConstructible<
  S extends SupportedAlgorithmSuites,
  Client extends AwsEsdkKMSInterface
> {
  new (input: KmsKeyringInput<Client>): KeyRing<S, Client>
}

export interface KeyRingConstructible<S extends SupportedAlgorithmSuites> {
  new (): Keyring<S>
}

export function KmsKeyringClass<
  S extends SupportedAlgorithmSuites,
  Client extends AwsEsdkKMSInterface
>(BaseKeyring: KeyRingConstructible<S>): KmsKeyRingConstructible<S, Client> {
  class KmsKeyring extends BaseKeyring implements KeyRing<S, Client> {
    public keyIds!: ReadonlyArray<string>
    public generatorKeyId?: string
    public clientProvider!: KmsClientSupplier<Client>
    public grantTokens?: string[]
    public isDiscovery!: boolean
    public discoveryFilter?: Readonly<{
      accountIDs: readonly string[]
      partition: string
    }>

    constructor({
      clientProvider,
      generatorKeyId,
      keyIds = [],
      grantTokens,
      discovery,
      discoveryFilter,
    }: KmsKeyringInput<Client>) {
      super()
      /* Precondition: This is an abstract class. (But TypeScript does not have a clean way to model this) */
      needs(this.constructor !== KmsKeyring, 'new KmsKeyring is not allowed')
      /* Precondition: A noop KmsKeyring is not allowed. */
      needs(
        !(!discovery && !generatorKeyId && !keyIds.length),
        'Noop keyring is not allowed: Set a keyId or discovery'
      )
      /* Precondition: A keyring can be either a Discovery or have keyIds configured. */
      needs(
        !(discovery && (generatorKeyId || keyIds.length)),
        'A keyring can be either a Discovery or have keyIds configured.'
      )
      /* Precondition: Discovery filter can only be configured in discovery mode. */
      needs(
        discovery || (!discovery && !discoveryFilter),
        'Account and partition decrypt filtering are only supported when discovery === true'
      )
      /* Precondition: A Discovery filter *must* be able to match something.
       * I am not going to wait to tell you
       * that no CMK can match an empty account list.
       * e.g. [], [''], '' are not valid.
       */
      needs(
        !discoveryFilter ||
          (discoveryFilter.accountIDs &&
            discoveryFilter.accountIDs.length &&
            !!discoveryFilter.partition &&
            discoveryFilter.accountIDs.every(
              (a) => typeof a === 'string' && !!a
            )),
        'A discovery filter must be able to match something.'
      )

      /* Precondition: All KMS key identifiers must be valid. */
      needs(
        !generatorKeyId ||
          typeof regionFromKmsKeyArn(generatorKeyId) === 'string',
        'Malformed arn.'
      )
      needs(
        keyIds.every(
          (keyArn) => typeof regionFromKmsKeyArn(keyArn) === 'string'
        ),
        'Malformed arn.'
      )
      /* Precondition: clientProvider needs to be a callable function. */
      needs(typeof clientProvider === 'function', 'Missing clientProvider')

      readOnlyProperty(this, 'clientProvider', clientProvider)
      readOnlyProperty(this, 'keyIds', Object.freeze(keyIds.slice()))
      readOnlyProperty(this, 'generatorKeyId', generatorKeyId)
      readOnlyProperty(this, 'grantTokens', grantTokens)
      readOnlyProperty(this, 'isDiscovery', !!discovery)
      readOnlyProperty(
        this,
        'discoveryFilter',
        discoveryFilter
          ? Object.freeze({
              ...discoveryFilter,
              accountIDs: Object.freeze(discoveryFilter.accountIDs),
            })
          : discoveryFilter
      )
    }

    /* Keyrings *must* preserve the order of EDK's.  The generatorKeyId is the first on this list. */
    async _onEncrypt(material: EncryptionMaterial<S>) {
      /* Check for early return (Postcondition): Discovery Keyrings do not encrypt. */
      if (this.isDiscovery) return material

      const keyIds = this.keyIds.slice()
      const { clientProvider, generatorKeyId, grantTokens } = this
      if (generatorKeyId && !material.hasUnencryptedDataKey) {
        const dataKey = await generateDataKey(
          clientProvider,
          material.suite.keyLengthBytes,
          generatorKeyId,
          material.encryptionContext,
          grantTokens
        )
        /* Precondition: A generatorKeyId must generate if we do not have an unencrypted data key.
         * Client supplier is allowed to return undefined if, for example, user wants to exclude particular
         * regions. But if we are here it means that user configured keyring with a KMS key that was
         * incompatible with the client supplier in use.
         */
        if (!dataKey)
          throw new Error('Generator KMS key did not generate a data key')

        const flags =
          KeyringTraceFlag.WRAPPING_KEY_GENERATED_DATA_KEY |
          KeyringTraceFlag.WRAPPING_KEY_SIGNED_ENC_CTX |
          KeyringTraceFlag.WRAPPING_KEY_ENCRYPTED_DATA_KEY
        const trace: KeyringTrace = {
          keyNamespace: KMS_PROVIDER_ID,
          keyName: dataKey.KeyId,
          flags,
        }

        material
          /* Postcondition: The generated unencryptedDataKey length must match the algorithm specification.
           * See cryptographic_materials as setUnencryptedDataKey will throw in this case.
           */
          .setUnencryptedDataKey(dataKey.Plaintext, trace)
          .addEncryptedDataKey(
            kmsResponseToEncryptedDataKey(dataKey),
            KeyringTraceFlag.WRAPPING_KEY_ENCRYPTED_DATA_KEY |
              KeyringTraceFlag.WRAPPING_KEY_SIGNED_ENC_CTX
          )
      } else if (generatorKeyId) {
        keyIds.unshift(generatorKeyId)
      }

      /* Precondition: If a generator does not exist, an unencryptedDataKey *must* already exist.
       * Furthermore *only* CMK's explicitly designated as generators can generate data keys.
       * See cryptographic_materials as getUnencryptedDataKey will throw in this case.
       */
      const unencryptedDataKey = unwrapDataKey(material.getUnencryptedDataKey())

      const flags =
        KeyringTraceFlag.WRAPPING_KEY_ENCRYPTED_DATA_KEY |
        KeyringTraceFlag.WRAPPING_KEY_SIGNED_ENC_CTX
      for (const kmsKey of keyIds) {
        const kmsEDK = await encrypt(
          clientProvider,
          unencryptedDataKey,
          kmsKey,
          material.encryptionContext,
          grantTokens
        )

        /* clientProvider may not return a client, in this case there is not an EDK to add */
        if (kmsEDK)
          material.addEncryptedDataKey(
            kmsResponseToEncryptedDataKey(kmsEDK),
            flags
          )
      }

      return material
    }

    async _onDecrypt(
      material: DecryptionMaterial<S>,
      encryptedDataKeys: EncryptedDataKey[]
    ) {
      const keyIds = this.keyIds.slice()
      const { clientProvider, generatorKeyId, grantTokens } = this
      if (generatorKeyId) keyIds.unshift(generatorKeyId)

      /* If there are no key IDs in the list, keyring is in "discovery" mode and will attempt KMS calls with
       * every ARN it comes across in the message. If there are key IDs in the list, it will cross check the
       * ARN it reads with that list before attempting KMS calls. Note that if caller provided key IDs in
       * anything other than a CMK ARN format, the Encryption SDK will not attempt to decrypt those data keys, because
       * the EDK data format always specifies the CMK with the full (non-alias) ARN.
       */
      const decryptableEDKs = encryptedDataKeys.filter(filterEDKs(keyIds, this))

      const cmkErrors: Error[] = []

      for (const edk of decryptableEDKs) {
        let dataKey: RequiredDecryptResponse | false = false
        try {
          dataKey = await decrypt(
            clientProvider,
            edk,
            material.encryptionContext,
            grantTokens
          )
        } catch (e) {
          /* Failures onDecrypt should not short-circuit the process
           * If the caller does not have access they may have access
           * through another Keyring.
           */
          cmkErrors.push(e)
        }

        /* Check for early return (Postcondition): clientProvider may not return a client. */
        if (!dataKey) continue

        /* Postcondition: The KeyId from KMS must match the encoded KeyID. */
        needs(
          dataKey.KeyId === edk.providerInfo,
          'KMS Decryption key does not match serialized provider.'
        )

        const flags =
          KeyringTraceFlag.WRAPPING_KEY_DECRYPTED_DATA_KEY |
          KeyringTraceFlag.WRAPPING_KEY_VERIFIED_ENC_CTX
        const trace: KeyringTrace = {
          keyNamespace: KMS_PROVIDER_ID,
          keyName: dataKey.KeyId,
          flags,
        }

        /* Postcondition: The decrypted unencryptedDataKey length must match the algorithm specification.
         * See cryptographic_materials as setUnencryptedDataKey will throw in this case.
         */
        material.setUnencryptedDataKey(dataKey.Plaintext, trace)
        return material
      }

      /* Postcondition: A CMK must provide a valid data key or KMS must not have raised any errors.
       * If I have a data key,
       * decrypt errors can be ignored.
       * However, if I was unable to decrypt a data key AND I have errors,
       * these errors should bubble up.
       * Otherwise, the only error customers will see is that
       * the material does not have an unencrypted data key.
       * So I return a concatenated Error message
       */
      needs(
        material.hasValidKey() ||
          (!material.hasValidKey() && !cmkErrors.length),
        cmkErrors.reduce(
          (m, e, i) => `${m} Error #${i + 1} \n ${e.stack} \n`,
          'Unable to decrypt data key and one or more KMS CMKs had an error. \n '
        )
      )

      return material
    }
  }
  immutableClass(KmsKeyring)
  return KmsKeyring
}

function filterEDKs<
  S extends SupportedAlgorithmSuites,
  Client extends AwsEsdkKMSInterface
>(keyIds: string[], { isDiscovery, discoveryFilter }: KeyRing<S, Client>) {
  return function filter({ providerId, providerInfo }: EncryptedDataKey) {
    /* Check for early return (Postcondition): Only AWS KMS EDK should be attempted. */
    if (providerId !== KMS_PROVIDER_ID) return false
    /* Discovery keyrings can not have keyIds configured,
     * and non-discovery keyrings must have keyIds configured.
     */
    if (isDiscovery) {
      /* Check for early return (Postcondition): There is no discoveryFilter to further condition discovery. */
      if (!discoveryFilter) return true

      /* If the providerInfo is an invalid ARN this will throw.
       * But, this function is also used to extract regions
       * from an CMK to generate a regional client.
       * This means it will NOT throw for something
       * that looks like a bare alias or key id.
       * However, these constructions will not have an account or partition.
       */
      const { account, partition } = decomposeAwsKmsKeyArn(providerInfo)
      /* Postcondition: The account and partition *must* match the discovery filter.
       * Since we are offering a runtime discovery of CMKs
       * it is best to have some form of filter on this.
       * The providerInfo is a CMK ARN and will have the account and partition.
       * By offering these levers customers can easily bound
       * the CMKs to ones they control without knowing the CMKs
       * when the AWS KMS Keyring is instantiated.
       */
      return (
        discoveryFilter.partition === partition &&
        discoveryFilter.accountIDs.some((a) => a === account)
      )
    } else {
      /* Postcondition: The EDK CMK (providerInfo) *must* match a configured CMK. */
      return keyIds.includes(providerInfo)
    }
  }
}
