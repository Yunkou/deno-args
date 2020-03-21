import {
  FlagType,
  ValueType
} from './types.ts'

import {
  ok,
  err,
  flag,
  findFlags
} from './utils.ts'

import {
  MissingFlag,
  ConflictFlags,
  MissingValue,
  UnexpectedFlag,
  ValueParsingFailure
} from './flag-errors.ts'

const listFlags = <Name extends string> (
  name: Name,
  descriptor: {
    readonly alias?: Iterable<string>
  }
): [Name, ...string[]] => [name, ...descriptor.alias || []]

const fmtAliasList = (alias?: readonly string[]) => alias?.length
  ? ` (alias ${alias.map(flag).join(' ')})`
  : ''

const fmtDescSuffix = (describe?: string) => describe
  ? `:\t${describe}`
  : ''

const fmtTypeHelp = (help?: () => string) => help
  ? '\n' + help()
  : ''

const sharedProps = (
  typeName: string,
  descriptor?: {
    readonly type: ValueType<any, any>
  }
) => ({
  [Symbol.toStringTag]: typeName + (
    descriptor ? `(${descriptor.type[Symbol.toStringTag]})` : ''
  )
})

export const EarlyExitFlag = <Name extends string> (
  name: Name,
  descriptor: EarlyExitDescriptor
): FlagType<Name, void> => ({
  name,
  extract (args) {
    const findRes = findFlags(args, listFlags(name, descriptor))
    if (findRes.length) return descriptor.exit()
    return ok({ value: undefined, consumedFlags: new Set() })
  },
  help () {
    const alias = fmtAliasList(descriptor.alias)
    const suffix = fmtDescSuffix(descriptor.describe)
    return `${flag(name)}${alias}${suffix}`
  },
  ...sharedProps('EarlyExitFlag')
})

export interface EarlyExitDescriptor {
  readonly describe?: string
  readonly alias?: readonly string[]
  readonly exit: () => never
}

export const BinaryFlag = <Name extends string> (
  name: Name,
  descriptor: FlagDescriptor = {}
): FlagType<Name, boolean> => ({
  name,
  extract (args) {
    const findRes = findFlags(args, listFlags(name, descriptor))
    return ok({
      value: Boolean(findRes.length),
      consumedFlags: new Set(findRes)
    })
  },
  help () {
    const alias = fmtAliasList(descriptor.alias)
    const suffix = fmtDescSuffix(descriptor.describe)
    return `${flag(name)}${alias}${suffix}`
  },
  ...sharedProps('BinaryFlag')
})

export { BinaryFlag as Flag }

export const CountFlag = <Name extends string> (
  name: Name,
  descriptor: FlagDescriptor = {}
): FlagType<Name, number> => ({
  name,
  extract (args) {
    const findRes = findFlags(args, listFlags(name, descriptor))
    return ok({
      value: findRes.length,
      consumedFlags: new Set(findRes)
    })
  },
  help () {
    const alias = fmtAliasList(descriptor.alias)
    const suffix = fmtDescSuffix(descriptor.describe)
    return `${flag(name)}... ${alias}${suffix}`
  },
  ...sharedProps('CountFlag')
})

export interface FlagDescriptor {
  readonly describe?: string
  readonly alias?: readonly string[]
}

export const Option = <Name extends string, Value> (
  name: Name,
  descriptor: OptionDescriptor<Value>
): FlagType<Name, Value> => ({
  name,
  extract (args) {
    const flags = listFlags(name, descriptor)
    const findRes = findFlags(args, flags)
    if (!findRes.length) return err(new MissingFlag(name))
    if (findRes.length !== 1) return err(new ConflictFlags(flags))
    const [res] = findRes
    const valPos = res.index + 1
    if (args.length <= valPos) return err(new MissingValue(res.name))
    const val = args[valPos]
    if (val.type !== 'value') return err(new UnexpectedFlag(res.name, val.raw))
    const parseResult = descriptor.type.extract([val.raw])
    if (!parseResult.tag) {
      return err(new ValueParsingFailure(res.name, parseResult.error))
    }
    return ok({
      value: parseResult.value,
      consumedFlags: new Set([res, val])
    })
  },
  help () {
    const typeName = descriptor.type.getTypeName()
    const alias = fmtAliasList(descriptor.alias)
    const suffix = fmtDescSuffix(descriptor.describe)
    const typeHelp = fmtTypeHelp(descriptor.type.help)
    return `${flag(name)} <${typeName}>${alias}${suffix}${typeHelp}`
  },
  ...sharedProps('Option', descriptor)
})

export interface OptionDescriptor<Value> {
  readonly type: ValueType<Value, [string]>
  readonly describe?: string
  readonly alias?: readonly string[]
}