
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model AgentSession
 * 
 */
export type AgentSession = $Result.DefaultSelection<Prisma.$AgentSessionPayload>
/**
 * Model AgentMessage
 * 
 */
export type AgentMessage = $Result.DefaultSelection<Prisma.$AgentMessagePayload>
/**
 * Model ConversationExport
 * 
 */
export type ConversationExport = $Result.DefaultSelection<Prisma.$ConversationExportPayload>
/**
 * Model SignalCache
 * 
 */
export type SignalCache = $Result.DefaultSelection<Prisma.$SignalCachePayload>
/**
 * Model UserSubscription
 * 
 */
export type UserSubscription = $Result.DefaultSelection<Prisma.$UserSubscriptionPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ContentType: {
  SUBSTACK_ARTICLE: 'SUBSTACK_ARTICLE',
  YOUTUBE_VIDEO: 'YOUTUBE_VIDEO',
  DIRECT_TEXT: 'DIRECT_TEXT',
  RESEARCH_REPORT: 'RESEARCH_REPORT',
  MARKET_COMMENTARY: 'MARKET_COMMENTARY'
};

export type ContentType = (typeof ContentType)[keyof typeof ContentType]


export const SessionStatus: {
  INITIALIZED: 'INITIALIZED',
  PROCESSING: 'PROCESSING',
  AGENT_DEBATE: 'AGENT_DEBATE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]


export const AgentType: {
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
  MARKET_CONTEXT: 'MARKET_CONTEXT',
  RISK_CHALLENGER: 'RISK_CHALLENGER',
  SYSTEM_ORCHESTRATOR: 'SYSTEM_ORCHESTRATOR'
};

export type AgentType = (typeof AgentType)[keyof typeof AgentType]


export const ExportFormat: {
  PDF: 'PDF',
  JSON: 'JSON',
  MARKDOWN: 'MARKDOWN',
  HTML: 'HTML',
  CSV: 'CSV'
};

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat]

}

export type ContentType = $Enums.ContentType

export const ContentType: typeof $Enums.ContentType

export type SessionStatus = $Enums.SessionStatus

export const SessionStatus: typeof $Enums.SessionStatus

export type AgentType = $Enums.AgentType

export const AgentType: typeof $Enums.AgentType

export type ExportFormat = $Enums.ExportFormat

export const ExportFormat: typeof $Enums.ExportFormat

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.agentSession`: Exposes CRUD operations for the **AgentSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AgentSessions
    * const agentSessions = await prisma.agentSession.findMany()
    * ```
    */
  get agentSession(): Prisma.AgentSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.agentMessage`: Exposes CRUD operations for the **AgentMessage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AgentMessages
    * const agentMessages = await prisma.agentMessage.findMany()
    * ```
    */
  get agentMessage(): Prisma.AgentMessageDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.conversationExport`: Exposes CRUD operations for the **ConversationExport** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ConversationExports
    * const conversationExports = await prisma.conversationExport.findMany()
    * ```
    */
  get conversationExport(): Prisma.ConversationExportDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.signalCache`: Exposes CRUD operations for the **SignalCache** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SignalCaches
    * const signalCaches = await prisma.signalCache.findMany()
    * ```
    */
  get signalCache(): Prisma.SignalCacheDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userSubscription`: Exposes CRUD operations for the **UserSubscription** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserSubscriptions
    * const userSubscriptions = await prisma.userSubscription.findMany()
    * ```
    */
  get userSubscription(): Prisma.UserSubscriptionDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.16.2
   * Query Engine version: 1c57fdcd7e44b29b9313256c76699e91c3ac3c43
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    AgentSession: 'AgentSession',
    AgentMessage: 'AgentMessage',
    ConversationExport: 'ConversationExport',
    SignalCache: 'SignalCache',
    UserSubscription: 'UserSubscription'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "agentSession" | "agentMessage" | "conversationExport" | "signalCache" | "userSubscription"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      AgentSession: {
        payload: Prisma.$AgentSessionPayload<ExtArgs>
        fields: Prisma.AgentSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AgentSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AgentSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>
          }
          findFirst: {
            args: Prisma.AgentSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AgentSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>
          }
          findMany: {
            args: Prisma.AgentSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>[]
          }
          create: {
            args: Prisma.AgentSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>
          }
          createMany: {
            args: Prisma.AgentSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AgentSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>[]
          }
          delete: {
            args: Prisma.AgentSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>
          }
          update: {
            args: Prisma.AgentSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>
          }
          deleteMany: {
            args: Prisma.AgentSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AgentSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AgentSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>[]
          }
          upsert: {
            args: Prisma.AgentSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentSessionPayload>
          }
          aggregate: {
            args: Prisma.AgentSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAgentSession>
          }
          groupBy: {
            args: Prisma.AgentSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<AgentSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.AgentSessionCountArgs<ExtArgs>
            result: $Utils.Optional<AgentSessionCountAggregateOutputType> | number
          }
        }
      }
      AgentMessage: {
        payload: Prisma.$AgentMessagePayload<ExtArgs>
        fields: Prisma.AgentMessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AgentMessageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AgentMessageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>
          }
          findFirst: {
            args: Prisma.AgentMessageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AgentMessageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>
          }
          findMany: {
            args: Prisma.AgentMessageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>[]
          }
          create: {
            args: Prisma.AgentMessageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>
          }
          createMany: {
            args: Prisma.AgentMessageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AgentMessageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>[]
          }
          delete: {
            args: Prisma.AgentMessageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>
          }
          update: {
            args: Prisma.AgentMessageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>
          }
          deleteMany: {
            args: Prisma.AgentMessageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AgentMessageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AgentMessageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>[]
          }
          upsert: {
            args: Prisma.AgentMessageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgentMessagePayload>
          }
          aggregate: {
            args: Prisma.AgentMessageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAgentMessage>
          }
          groupBy: {
            args: Prisma.AgentMessageGroupByArgs<ExtArgs>
            result: $Utils.Optional<AgentMessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.AgentMessageCountArgs<ExtArgs>
            result: $Utils.Optional<AgentMessageCountAggregateOutputType> | number
          }
        }
      }
      ConversationExport: {
        payload: Prisma.$ConversationExportPayload<ExtArgs>
        fields: Prisma.ConversationExportFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConversationExportFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConversationExportFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>
          }
          findFirst: {
            args: Prisma.ConversationExportFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConversationExportFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>
          }
          findMany: {
            args: Prisma.ConversationExportFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>[]
          }
          create: {
            args: Prisma.ConversationExportCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>
          }
          createMany: {
            args: Prisma.ConversationExportCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConversationExportCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>[]
          }
          delete: {
            args: Prisma.ConversationExportDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>
          }
          update: {
            args: Prisma.ConversationExportUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>
          }
          deleteMany: {
            args: Prisma.ConversationExportDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConversationExportUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ConversationExportUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>[]
          }
          upsert: {
            args: Prisma.ConversationExportUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConversationExportPayload>
          }
          aggregate: {
            args: Prisma.ConversationExportAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConversationExport>
          }
          groupBy: {
            args: Prisma.ConversationExportGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConversationExportGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConversationExportCountArgs<ExtArgs>
            result: $Utils.Optional<ConversationExportCountAggregateOutputType> | number
          }
        }
      }
      SignalCache: {
        payload: Prisma.$SignalCachePayload<ExtArgs>
        fields: Prisma.SignalCacheFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SignalCacheFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SignalCacheFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>
          }
          findFirst: {
            args: Prisma.SignalCacheFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SignalCacheFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>
          }
          findMany: {
            args: Prisma.SignalCacheFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>[]
          }
          create: {
            args: Prisma.SignalCacheCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>
          }
          createMany: {
            args: Prisma.SignalCacheCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SignalCacheCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>[]
          }
          delete: {
            args: Prisma.SignalCacheDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>
          }
          update: {
            args: Prisma.SignalCacheUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>
          }
          deleteMany: {
            args: Prisma.SignalCacheDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SignalCacheUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SignalCacheUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>[]
          }
          upsert: {
            args: Prisma.SignalCacheUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SignalCachePayload>
          }
          aggregate: {
            args: Prisma.SignalCacheAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSignalCache>
          }
          groupBy: {
            args: Prisma.SignalCacheGroupByArgs<ExtArgs>
            result: $Utils.Optional<SignalCacheGroupByOutputType>[]
          }
          count: {
            args: Prisma.SignalCacheCountArgs<ExtArgs>
            result: $Utils.Optional<SignalCacheCountAggregateOutputType> | number
          }
        }
      }
      UserSubscription: {
        payload: Prisma.$UserSubscriptionPayload<ExtArgs>
        fields: Prisma.UserSubscriptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserSubscriptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserSubscriptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>
          }
          findFirst: {
            args: Prisma.UserSubscriptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserSubscriptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>
          }
          findMany: {
            args: Prisma.UserSubscriptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>[]
          }
          create: {
            args: Prisma.UserSubscriptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>
          }
          createMany: {
            args: Prisma.UserSubscriptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserSubscriptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>[]
          }
          delete: {
            args: Prisma.UserSubscriptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>
          }
          update: {
            args: Prisma.UserSubscriptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>
          }
          deleteMany: {
            args: Prisma.UserSubscriptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserSubscriptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserSubscriptionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>[]
          }
          upsert: {
            args: Prisma.UserSubscriptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserSubscriptionPayload>
          }
          aggregate: {
            args: Prisma.UserSubscriptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserSubscription>
          }
          groupBy: {
            args: Prisma.UserSubscriptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserSubscriptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserSubscriptionCountArgs<ExtArgs>
            result: $Utils.Optional<UserSubscriptionCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    agentSession?: AgentSessionOmit
    agentMessage?: AgentMessageOmit
    conversationExport?: ConversationExportOmit
    signalCache?: SignalCacheOmit
    userSubscription?: UserSubscriptionOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    agentSessions: number
    conversationExports: number
    userSubscriptions: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agentSessions?: boolean | UserCountOutputTypeCountAgentSessionsArgs
    conversationExports?: boolean | UserCountOutputTypeCountConversationExportsArgs
    userSubscriptions?: boolean | UserCountOutputTypeCountUserSubscriptionsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAgentSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AgentSessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountConversationExportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConversationExportWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUserSubscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSubscriptionWhereInput
  }


  /**
   * Count Type AgentSessionCountOutputType
   */

  export type AgentSessionCountOutputType = {
    messages: number
    exports: number
  }

  export type AgentSessionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | AgentSessionCountOutputTypeCountMessagesArgs
    exports?: boolean | AgentSessionCountOutputTypeCountExportsArgs
  }

  // Custom InputTypes
  /**
   * AgentSessionCountOutputType without action
   */
  export type AgentSessionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSessionCountOutputType
     */
    select?: AgentSessionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AgentSessionCountOutputType without action
   */
  export type AgentSessionCountOutputTypeCountMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AgentMessageWhereInput
  }

  /**
   * AgentSessionCountOutputType without action
   */
  export type AgentSessionCountOutputTypeCountExportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConversationExportWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    clerkUserId: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
    lastLoginAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    clerkUserId: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
    lastLoginAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    clerkUserId: number
    email: number
    firstName: number
    lastName: number
    imageUrl: number
    isActive: number
    preferences: number
    createdAt: number
    updatedAt: number
    lastLoginAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    clerkUserId?: true
    email?: true
    firstName?: true
    lastName?: true
    imageUrl?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    lastLoginAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    clerkUserId?: true
    email?: true
    firstName?: true
    lastName?: true
    imageUrl?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    lastLoginAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    clerkUserId?: true
    email?: true
    firstName?: true
    lastName?: true
    imageUrl?: true
    isActive?: true
    preferences?: true
    createdAt?: true
    updatedAt?: true
    lastLoginAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    clerkUserId: string
    email: string
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
    isActive: boolean
    preferences: JsonValue | null
    createdAt: Date
    updatedAt: Date
    lastLoginAt: Date | null
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    imageUrl?: boolean
    isActive?: boolean
    preferences?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastLoginAt?: boolean
    agentSessions?: boolean | User$agentSessionsArgs<ExtArgs>
    conversationExports?: boolean | User$conversationExportsArgs<ExtArgs>
    userSubscriptions?: boolean | User$userSubscriptionsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    imageUrl?: boolean
    isActive?: boolean
    preferences?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastLoginAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    imageUrl?: boolean
    isActive?: boolean
    preferences?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastLoginAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    clerkUserId?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    imageUrl?: boolean
    isActive?: boolean
    preferences?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastLoginAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "clerkUserId" | "email" | "firstName" | "lastName" | "imageUrl" | "isActive" | "preferences" | "createdAt" | "updatedAt" | "lastLoginAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agentSessions?: boolean | User$agentSessionsArgs<ExtArgs>
    conversationExports?: boolean | User$conversationExportsArgs<ExtArgs>
    userSubscriptions?: boolean | User$userSubscriptionsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      agentSessions: Prisma.$AgentSessionPayload<ExtArgs>[]
      conversationExports: Prisma.$ConversationExportPayload<ExtArgs>[]
      userSubscriptions: Prisma.$UserSubscriptionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clerkUserId: string
      email: string
      firstName: string | null
      lastName: string | null
      imageUrl: string | null
      isActive: boolean
      preferences: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
      lastLoginAt: Date | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agentSessions<T extends User$agentSessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$agentSessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    conversationExports<T extends User$conversationExportsArgs<ExtArgs> = {}>(args?: Subset<T, User$conversationExportsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    userSubscriptions<T extends User$userSubscriptionsArgs<ExtArgs> = {}>(args?: Subset<T, User$userSubscriptionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly clerkUserId: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly firstName: FieldRef<"User", 'String'>
    readonly lastName: FieldRef<"User", 'String'>
    readonly imageUrl: FieldRef<"User", 'String'>
    readonly isActive: FieldRef<"User", 'Boolean'>
    readonly preferences: FieldRef<"User", 'Json'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly lastLoginAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.agentSessions
   */
  export type User$agentSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    where?: AgentSessionWhereInput
    orderBy?: AgentSessionOrderByWithRelationInput | AgentSessionOrderByWithRelationInput[]
    cursor?: AgentSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AgentSessionScalarFieldEnum | AgentSessionScalarFieldEnum[]
  }

  /**
   * User.conversationExports
   */
  export type User$conversationExportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    where?: ConversationExportWhereInput
    orderBy?: ConversationExportOrderByWithRelationInput | ConversationExportOrderByWithRelationInput[]
    cursor?: ConversationExportWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConversationExportScalarFieldEnum | ConversationExportScalarFieldEnum[]
  }

  /**
   * User.userSubscriptions
   */
  export type User$userSubscriptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    where?: UserSubscriptionWhereInput
    orderBy?: UserSubscriptionOrderByWithRelationInput | UserSubscriptionOrderByWithRelationInput[]
    cursor?: UserSubscriptionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserSubscriptionScalarFieldEnum | UserSubscriptionScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model AgentSession
   */

  export type AggregateAgentSession = {
    _count: AgentSessionCountAggregateOutputType | null
    _min: AgentSessionMinAggregateOutputType | null
    _max: AgentSessionMaxAggregateOutputType | null
  }

  export type AgentSessionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    sessionTitle: string | null
    contentType: $Enums.ContentType | null
    contentSource: string | null
    contentUrl: string | null
    contentText: string | null
    status: $Enums.SessionStatus | null
    startedAt: Date | null
    completedAt: Date | null
  }

  export type AgentSessionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    sessionTitle: string | null
    contentType: $Enums.ContentType | null
    contentSource: string | null
    contentUrl: string | null
    contentText: string | null
    status: $Enums.SessionStatus | null
    startedAt: Date | null
    completedAt: Date | null
  }

  export type AgentSessionCountAggregateOutputType = {
    id: number
    userId: number
    sessionTitle: number
    contentType: number
    contentSource: number
    contentUrl: number
    contentText: number
    status: number
    startedAt: number
    completedAt: number
    metadata: number
    _all: number
  }


  export type AgentSessionMinAggregateInputType = {
    id?: true
    userId?: true
    sessionTitle?: true
    contentType?: true
    contentSource?: true
    contentUrl?: true
    contentText?: true
    status?: true
    startedAt?: true
    completedAt?: true
  }

  export type AgentSessionMaxAggregateInputType = {
    id?: true
    userId?: true
    sessionTitle?: true
    contentType?: true
    contentSource?: true
    contentUrl?: true
    contentText?: true
    status?: true
    startedAt?: true
    completedAt?: true
  }

  export type AgentSessionCountAggregateInputType = {
    id?: true
    userId?: true
    sessionTitle?: true
    contentType?: true
    contentSource?: true
    contentUrl?: true
    contentText?: true
    status?: true
    startedAt?: true
    completedAt?: true
    metadata?: true
    _all?: true
  }

  export type AgentSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgentSession to aggregate.
     */
    where?: AgentSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentSessions to fetch.
     */
    orderBy?: AgentSessionOrderByWithRelationInput | AgentSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AgentSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AgentSessions
    **/
    _count?: true | AgentSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AgentSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AgentSessionMaxAggregateInputType
  }

  export type GetAgentSessionAggregateType<T extends AgentSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateAgentSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAgentSession[P]>
      : GetScalarType<T[P], AggregateAgentSession[P]>
  }




  export type AgentSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AgentSessionWhereInput
    orderBy?: AgentSessionOrderByWithAggregationInput | AgentSessionOrderByWithAggregationInput[]
    by: AgentSessionScalarFieldEnum[] | AgentSessionScalarFieldEnum
    having?: AgentSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AgentSessionCountAggregateInputType | true
    _min?: AgentSessionMinAggregateInputType
    _max?: AgentSessionMaxAggregateInputType
  }

  export type AgentSessionGroupByOutputType = {
    id: string
    userId: string | null
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl: string | null
    contentText: string
    status: $Enums.SessionStatus
    startedAt: Date
    completedAt: Date | null
    metadata: JsonValue | null
    _count: AgentSessionCountAggregateOutputType | null
    _min: AgentSessionMinAggregateOutputType | null
    _max: AgentSessionMaxAggregateOutputType | null
  }

  type GetAgentSessionGroupByPayload<T extends AgentSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AgentSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AgentSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AgentSessionGroupByOutputType[P]>
            : GetScalarType<T[P], AgentSessionGroupByOutputType[P]>
        }
      >
    >


  export type AgentSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    sessionTitle?: boolean
    contentType?: boolean
    contentSource?: boolean
    contentUrl?: boolean
    contentText?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    metadata?: boolean
    user?: boolean | AgentSession$userArgs<ExtArgs>
    messages?: boolean | AgentSession$messagesArgs<ExtArgs>
    exports?: boolean | AgentSession$exportsArgs<ExtArgs>
    _count?: boolean | AgentSessionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["agentSession"]>

  export type AgentSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    sessionTitle?: boolean
    contentType?: boolean
    contentSource?: boolean
    contentUrl?: boolean
    contentText?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    metadata?: boolean
    user?: boolean | AgentSession$userArgs<ExtArgs>
  }, ExtArgs["result"]["agentSession"]>

  export type AgentSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    sessionTitle?: boolean
    contentType?: boolean
    contentSource?: boolean
    contentUrl?: boolean
    contentText?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    metadata?: boolean
    user?: boolean | AgentSession$userArgs<ExtArgs>
  }, ExtArgs["result"]["agentSession"]>

  export type AgentSessionSelectScalar = {
    id?: boolean
    userId?: boolean
    sessionTitle?: boolean
    contentType?: boolean
    contentSource?: boolean
    contentUrl?: boolean
    contentText?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    metadata?: boolean
  }

  export type AgentSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "sessionTitle" | "contentType" | "contentSource" | "contentUrl" | "contentText" | "status" | "startedAt" | "completedAt" | "metadata", ExtArgs["result"]["agentSession"]>
  export type AgentSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AgentSession$userArgs<ExtArgs>
    messages?: boolean | AgentSession$messagesArgs<ExtArgs>
    exports?: boolean | AgentSession$exportsArgs<ExtArgs>
    _count?: boolean | AgentSessionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AgentSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AgentSession$userArgs<ExtArgs>
  }
  export type AgentSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AgentSession$userArgs<ExtArgs>
  }

  export type $AgentSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AgentSession"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
      messages: Prisma.$AgentMessagePayload<ExtArgs>[]
      exports: Prisma.$ConversationExportPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      sessionTitle: string
      contentType: $Enums.ContentType
      contentSource: string
      contentUrl: string | null
      contentText: string
      status: $Enums.SessionStatus
      startedAt: Date
      completedAt: Date | null
      metadata: Prisma.JsonValue | null
    }, ExtArgs["result"]["agentSession"]>
    composites: {}
  }

  type AgentSessionGetPayload<S extends boolean | null | undefined | AgentSessionDefaultArgs> = $Result.GetResult<Prisma.$AgentSessionPayload, S>

  type AgentSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AgentSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AgentSessionCountAggregateInputType | true
    }

  export interface AgentSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AgentSession'], meta: { name: 'AgentSession' } }
    /**
     * Find zero or one AgentSession that matches the filter.
     * @param {AgentSessionFindUniqueArgs} args - Arguments to find a AgentSession
     * @example
     * // Get one AgentSession
     * const agentSession = await prisma.agentSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AgentSessionFindUniqueArgs>(args: SelectSubset<T, AgentSessionFindUniqueArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AgentSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AgentSessionFindUniqueOrThrowArgs} args - Arguments to find a AgentSession
     * @example
     * // Get one AgentSession
     * const agentSession = await prisma.agentSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AgentSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, AgentSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AgentSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionFindFirstArgs} args - Arguments to find a AgentSession
     * @example
     * // Get one AgentSession
     * const agentSession = await prisma.agentSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AgentSessionFindFirstArgs>(args?: SelectSubset<T, AgentSessionFindFirstArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AgentSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionFindFirstOrThrowArgs} args - Arguments to find a AgentSession
     * @example
     * // Get one AgentSession
     * const agentSession = await prisma.agentSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AgentSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, AgentSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AgentSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AgentSessions
     * const agentSessions = await prisma.agentSession.findMany()
     * 
     * // Get first 10 AgentSessions
     * const agentSessions = await prisma.agentSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const agentSessionWithIdOnly = await prisma.agentSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AgentSessionFindManyArgs>(args?: SelectSubset<T, AgentSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AgentSession.
     * @param {AgentSessionCreateArgs} args - Arguments to create a AgentSession.
     * @example
     * // Create one AgentSession
     * const AgentSession = await prisma.agentSession.create({
     *   data: {
     *     // ... data to create a AgentSession
     *   }
     * })
     * 
     */
    create<T extends AgentSessionCreateArgs>(args: SelectSubset<T, AgentSessionCreateArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AgentSessions.
     * @param {AgentSessionCreateManyArgs} args - Arguments to create many AgentSessions.
     * @example
     * // Create many AgentSessions
     * const agentSession = await prisma.agentSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AgentSessionCreateManyArgs>(args?: SelectSubset<T, AgentSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AgentSessions and returns the data saved in the database.
     * @param {AgentSessionCreateManyAndReturnArgs} args - Arguments to create many AgentSessions.
     * @example
     * // Create many AgentSessions
     * const agentSession = await prisma.agentSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AgentSessions and only return the `id`
     * const agentSessionWithIdOnly = await prisma.agentSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AgentSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, AgentSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AgentSession.
     * @param {AgentSessionDeleteArgs} args - Arguments to delete one AgentSession.
     * @example
     * // Delete one AgentSession
     * const AgentSession = await prisma.agentSession.delete({
     *   where: {
     *     // ... filter to delete one AgentSession
     *   }
     * })
     * 
     */
    delete<T extends AgentSessionDeleteArgs>(args: SelectSubset<T, AgentSessionDeleteArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AgentSession.
     * @param {AgentSessionUpdateArgs} args - Arguments to update one AgentSession.
     * @example
     * // Update one AgentSession
     * const agentSession = await prisma.agentSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AgentSessionUpdateArgs>(args: SelectSubset<T, AgentSessionUpdateArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AgentSessions.
     * @param {AgentSessionDeleteManyArgs} args - Arguments to filter AgentSessions to delete.
     * @example
     * // Delete a few AgentSessions
     * const { count } = await prisma.agentSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AgentSessionDeleteManyArgs>(args?: SelectSubset<T, AgentSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgentSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AgentSessions
     * const agentSession = await prisma.agentSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AgentSessionUpdateManyArgs>(args: SelectSubset<T, AgentSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgentSessions and returns the data updated in the database.
     * @param {AgentSessionUpdateManyAndReturnArgs} args - Arguments to update many AgentSessions.
     * @example
     * // Update many AgentSessions
     * const agentSession = await prisma.agentSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AgentSessions and only return the `id`
     * const agentSessionWithIdOnly = await prisma.agentSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AgentSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, AgentSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AgentSession.
     * @param {AgentSessionUpsertArgs} args - Arguments to update or create a AgentSession.
     * @example
     * // Update or create a AgentSession
     * const agentSession = await prisma.agentSession.upsert({
     *   create: {
     *     // ... data to create a AgentSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AgentSession we want to update
     *   }
     * })
     */
    upsert<T extends AgentSessionUpsertArgs>(args: SelectSubset<T, AgentSessionUpsertArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AgentSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionCountArgs} args - Arguments to filter AgentSessions to count.
     * @example
     * // Count the number of AgentSessions
     * const count = await prisma.agentSession.count({
     *   where: {
     *     // ... the filter for the AgentSessions we want to count
     *   }
     * })
    **/
    count<T extends AgentSessionCountArgs>(
      args?: Subset<T, AgentSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AgentSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AgentSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AgentSessionAggregateArgs>(args: Subset<T, AgentSessionAggregateArgs>): Prisma.PrismaPromise<GetAgentSessionAggregateType<T>>

    /**
     * Group by AgentSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AgentSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AgentSessionGroupByArgs['orderBy'] }
        : { orderBy?: AgentSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AgentSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAgentSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AgentSession model
   */
  readonly fields: AgentSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AgentSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AgentSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends AgentSession$userArgs<ExtArgs> = {}>(args?: Subset<T, AgentSession$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    messages<T extends AgentSession$messagesArgs<ExtArgs> = {}>(args?: Subset<T, AgentSession$messagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    exports<T extends AgentSession$exportsArgs<ExtArgs> = {}>(args?: Subset<T, AgentSession$exportsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AgentSession model
   */
  interface AgentSessionFieldRefs {
    readonly id: FieldRef<"AgentSession", 'String'>
    readonly userId: FieldRef<"AgentSession", 'String'>
    readonly sessionTitle: FieldRef<"AgentSession", 'String'>
    readonly contentType: FieldRef<"AgentSession", 'ContentType'>
    readonly contentSource: FieldRef<"AgentSession", 'String'>
    readonly contentUrl: FieldRef<"AgentSession", 'String'>
    readonly contentText: FieldRef<"AgentSession", 'String'>
    readonly status: FieldRef<"AgentSession", 'SessionStatus'>
    readonly startedAt: FieldRef<"AgentSession", 'DateTime'>
    readonly completedAt: FieldRef<"AgentSession", 'DateTime'>
    readonly metadata: FieldRef<"AgentSession", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * AgentSession findUnique
   */
  export type AgentSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * Filter, which AgentSession to fetch.
     */
    where: AgentSessionWhereUniqueInput
  }

  /**
   * AgentSession findUniqueOrThrow
   */
  export type AgentSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * Filter, which AgentSession to fetch.
     */
    where: AgentSessionWhereUniqueInput
  }

  /**
   * AgentSession findFirst
   */
  export type AgentSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * Filter, which AgentSession to fetch.
     */
    where?: AgentSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentSessions to fetch.
     */
    orderBy?: AgentSessionOrderByWithRelationInput | AgentSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgentSessions.
     */
    cursor?: AgentSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgentSessions.
     */
    distinct?: AgentSessionScalarFieldEnum | AgentSessionScalarFieldEnum[]
  }

  /**
   * AgentSession findFirstOrThrow
   */
  export type AgentSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * Filter, which AgentSession to fetch.
     */
    where?: AgentSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentSessions to fetch.
     */
    orderBy?: AgentSessionOrderByWithRelationInput | AgentSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgentSessions.
     */
    cursor?: AgentSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgentSessions.
     */
    distinct?: AgentSessionScalarFieldEnum | AgentSessionScalarFieldEnum[]
  }

  /**
   * AgentSession findMany
   */
  export type AgentSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * Filter, which AgentSessions to fetch.
     */
    where?: AgentSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentSessions to fetch.
     */
    orderBy?: AgentSessionOrderByWithRelationInput | AgentSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AgentSessions.
     */
    cursor?: AgentSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentSessions.
     */
    skip?: number
    distinct?: AgentSessionScalarFieldEnum | AgentSessionScalarFieldEnum[]
  }

  /**
   * AgentSession create
   */
  export type AgentSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a AgentSession.
     */
    data: XOR<AgentSessionCreateInput, AgentSessionUncheckedCreateInput>
  }

  /**
   * AgentSession createMany
   */
  export type AgentSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AgentSessions.
     */
    data: AgentSessionCreateManyInput | AgentSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AgentSession createManyAndReturn
   */
  export type AgentSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * The data used to create many AgentSessions.
     */
    data: AgentSessionCreateManyInput | AgentSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AgentSession update
   */
  export type AgentSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a AgentSession.
     */
    data: XOR<AgentSessionUpdateInput, AgentSessionUncheckedUpdateInput>
    /**
     * Choose, which AgentSession to update.
     */
    where: AgentSessionWhereUniqueInput
  }

  /**
   * AgentSession updateMany
   */
  export type AgentSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AgentSessions.
     */
    data: XOR<AgentSessionUpdateManyMutationInput, AgentSessionUncheckedUpdateManyInput>
    /**
     * Filter which AgentSessions to update
     */
    where?: AgentSessionWhereInput
    /**
     * Limit how many AgentSessions to update.
     */
    limit?: number
  }

  /**
   * AgentSession updateManyAndReturn
   */
  export type AgentSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * The data used to update AgentSessions.
     */
    data: XOR<AgentSessionUpdateManyMutationInput, AgentSessionUncheckedUpdateManyInput>
    /**
     * Filter which AgentSessions to update
     */
    where?: AgentSessionWhereInput
    /**
     * Limit how many AgentSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AgentSession upsert
   */
  export type AgentSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the AgentSession to update in case it exists.
     */
    where: AgentSessionWhereUniqueInput
    /**
     * In case the AgentSession found by the `where` argument doesn't exist, create a new AgentSession with this data.
     */
    create: XOR<AgentSessionCreateInput, AgentSessionUncheckedCreateInput>
    /**
     * In case the AgentSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AgentSessionUpdateInput, AgentSessionUncheckedUpdateInput>
  }

  /**
   * AgentSession delete
   */
  export type AgentSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
    /**
     * Filter which AgentSession to delete.
     */
    where: AgentSessionWhereUniqueInput
  }

  /**
   * AgentSession deleteMany
   */
  export type AgentSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgentSessions to delete
     */
    where?: AgentSessionWhereInput
    /**
     * Limit how many AgentSessions to delete.
     */
    limit?: number
  }

  /**
   * AgentSession.user
   */
  export type AgentSession$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * AgentSession.messages
   */
  export type AgentSession$messagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    where?: AgentMessageWhereInput
    orderBy?: AgentMessageOrderByWithRelationInput | AgentMessageOrderByWithRelationInput[]
    cursor?: AgentMessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AgentMessageScalarFieldEnum | AgentMessageScalarFieldEnum[]
  }

  /**
   * AgentSession.exports
   */
  export type AgentSession$exportsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    where?: ConversationExportWhereInput
    orderBy?: ConversationExportOrderByWithRelationInput | ConversationExportOrderByWithRelationInput[]
    cursor?: ConversationExportWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConversationExportScalarFieldEnum | ConversationExportScalarFieldEnum[]
  }

  /**
   * AgentSession without action
   */
  export type AgentSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentSession
     */
    select?: AgentSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentSession
     */
    omit?: AgentSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentSessionInclude<ExtArgs> | null
  }


  /**
   * Model AgentMessage
   */

  export type AggregateAgentMessage = {
    _count: AgentMessageCountAggregateOutputType | null
    _avg: AgentMessageAvgAggregateOutputType | null
    _sum: AgentMessageSumAggregateOutputType | null
    _min: AgentMessageMinAggregateOutputType | null
    _max: AgentMessageMaxAggregateOutputType | null
  }

  export type AgentMessageAvgAggregateOutputType = {
    messageOrder: number | null
    confidence: number | null
  }

  export type AgentMessageSumAggregateOutputType = {
    messageOrder: number | null
    confidence: number | null
  }

  export type AgentMessageMinAggregateOutputType = {
    id: string | null
    sessionId: string | null
    agentType: $Enums.AgentType | null
    messageContent: string | null
    messageOrder: number | null
    timestamp: Date | null
    confidence: number | null
  }

  export type AgentMessageMaxAggregateOutputType = {
    id: string | null
    sessionId: string | null
    agentType: $Enums.AgentType | null
    messageContent: string | null
    messageOrder: number | null
    timestamp: Date | null
    confidence: number | null
  }

  export type AgentMessageCountAggregateOutputType = {
    id: number
    sessionId: number
    agentType: number
    messageContent: number
    messageOrder: number
    timestamp: number
    confidence: number
    sources: number
    metadata: number
    _all: number
  }


  export type AgentMessageAvgAggregateInputType = {
    messageOrder?: true
    confidence?: true
  }

  export type AgentMessageSumAggregateInputType = {
    messageOrder?: true
    confidence?: true
  }

  export type AgentMessageMinAggregateInputType = {
    id?: true
    sessionId?: true
    agentType?: true
    messageContent?: true
    messageOrder?: true
    timestamp?: true
    confidence?: true
  }

  export type AgentMessageMaxAggregateInputType = {
    id?: true
    sessionId?: true
    agentType?: true
    messageContent?: true
    messageOrder?: true
    timestamp?: true
    confidence?: true
  }

  export type AgentMessageCountAggregateInputType = {
    id?: true
    sessionId?: true
    agentType?: true
    messageContent?: true
    messageOrder?: true
    timestamp?: true
    confidence?: true
    sources?: true
    metadata?: true
    _all?: true
  }

  export type AgentMessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgentMessage to aggregate.
     */
    where?: AgentMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentMessages to fetch.
     */
    orderBy?: AgentMessageOrderByWithRelationInput | AgentMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AgentMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AgentMessages
    **/
    _count?: true | AgentMessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AgentMessageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AgentMessageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AgentMessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AgentMessageMaxAggregateInputType
  }

  export type GetAgentMessageAggregateType<T extends AgentMessageAggregateArgs> = {
        [P in keyof T & keyof AggregateAgentMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAgentMessage[P]>
      : GetScalarType<T[P], AggregateAgentMessage[P]>
  }




  export type AgentMessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AgentMessageWhereInput
    orderBy?: AgentMessageOrderByWithAggregationInput | AgentMessageOrderByWithAggregationInput[]
    by: AgentMessageScalarFieldEnum[] | AgentMessageScalarFieldEnum
    having?: AgentMessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AgentMessageCountAggregateInputType | true
    _avg?: AgentMessageAvgAggregateInputType
    _sum?: AgentMessageSumAggregateInputType
    _min?: AgentMessageMinAggregateInputType
    _max?: AgentMessageMaxAggregateInputType
  }

  export type AgentMessageGroupByOutputType = {
    id: string
    sessionId: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp: Date
    confidence: number | null
    sources: JsonValue | null
    metadata: JsonValue | null
    _count: AgentMessageCountAggregateOutputType | null
    _avg: AgentMessageAvgAggregateOutputType | null
    _sum: AgentMessageSumAggregateOutputType | null
    _min: AgentMessageMinAggregateOutputType | null
    _max: AgentMessageMaxAggregateOutputType | null
  }

  type GetAgentMessageGroupByPayload<T extends AgentMessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AgentMessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AgentMessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AgentMessageGroupByOutputType[P]>
            : GetScalarType<T[P], AgentMessageGroupByOutputType[P]>
        }
      >
    >


  export type AgentMessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    agentType?: boolean
    messageContent?: boolean
    messageOrder?: boolean
    timestamp?: boolean
    confidence?: boolean
    sources?: boolean
    metadata?: boolean
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["agentMessage"]>

  export type AgentMessageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    agentType?: boolean
    messageContent?: boolean
    messageOrder?: boolean
    timestamp?: boolean
    confidence?: boolean
    sources?: boolean
    metadata?: boolean
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["agentMessage"]>

  export type AgentMessageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    agentType?: boolean
    messageContent?: boolean
    messageOrder?: boolean
    timestamp?: boolean
    confidence?: boolean
    sources?: boolean
    metadata?: boolean
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["agentMessage"]>

  export type AgentMessageSelectScalar = {
    id?: boolean
    sessionId?: boolean
    agentType?: boolean
    messageContent?: boolean
    messageOrder?: boolean
    timestamp?: boolean
    confidence?: boolean
    sources?: boolean
    metadata?: boolean
  }

  export type AgentMessageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "sessionId" | "agentType" | "messageContent" | "messageOrder" | "timestamp" | "confidence" | "sources" | "metadata", ExtArgs["result"]["agentMessage"]>
  export type AgentMessageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
  }
  export type AgentMessageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
  }
  export type AgentMessageIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
  }

  export type $AgentMessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AgentMessage"
    objects: {
      session: Prisma.$AgentSessionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      sessionId: string
      agentType: $Enums.AgentType
      messageContent: string
      messageOrder: number
      timestamp: Date
      confidence: number | null
      sources: Prisma.JsonValue | null
      metadata: Prisma.JsonValue | null
    }, ExtArgs["result"]["agentMessage"]>
    composites: {}
  }

  type AgentMessageGetPayload<S extends boolean | null | undefined | AgentMessageDefaultArgs> = $Result.GetResult<Prisma.$AgentMessagePayload, S>

  type AgentMessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AgentMessageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AgentMessageCountAggregateInputType | true
    }

  export interface AgentMessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AgentMessage'], meta: { name: 'AgentMessage' } }
    /**
     * Find zero or one AgentMessage that matches the filter.
     * @param {AgentMessageFindUniqueArgs} args - Arguments to find a AgentMessage
     * @example
     * // Get one AgentMessage
     * const agentMessage = await prisma.agentMessage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AgentMessageFindUniqueArgs>(args: SelectSubset<T, AgentMessageFindUniqueArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AgentMessage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AgentMessageFindUniqueOrThrowArgs} args - Arguments to find a AgentMessage
     * @example
     * // Get one AgentMessage
     * const agentMessage = await prisma.agentMessage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AgentMessageFindUniqueOrThrowArgs>(args: SelectSubset<T, AgentMessageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AgentMessage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageFindFirstArgs} args - Arguments to find a AgentMessage
     * @example
     * // Get one AgentMessage
     * const agentMessage = await prisma.agentMessage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AgentMessageFindFirstArgs>(args?: SelectSubset<T, AgentMessageFindFirstArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AgentMessage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageFindFirstOrThrowArgs} args - Arguments to find a AgentMessage
     * @example
     * // Get one AgentMessage
     * const agentMessage = await prisma.agentMessage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AgentMessageFindFirstOrThrowArgs>(args?: SelectSubset<T, AgentMessageFindFirstOrThrowArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AgentMessages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AgentMessages
     * const agentMessages = await prisma.agentMessage.findMany()
     * 
     * // Get first 10 AgentMessages
     * const agentMessages = await prisma.agentMessage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const agentMessageWithIdOnly = await prisma.agentMessage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AgentMessageFindManyArgs>(args?: SelectSubset<T, AgentMessageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AgentMessage.
     * @param {AgentMessageCreateArgs} args - Arguments to create a AgentMessage.
     * @example
     * // Create one AgentMessage
     * const AgentMessage = await prisma.agentMessage.create({
     *   data: {
     *     // ... data to create a AgentMessage
     *   }
     * })
     * 
     */
    create<T extends AgentMessageCreateArgs>(args: SelectSubset<T, AgentMessageCreateArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AgentMessages.
     * @param {AgentMessageCreateManyArgs} args - Arguments to create many AgentMessages.
     * @example
     * // Create many AgentMessages
     * const agentMessage = await prisma.agentMessage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AgentMessageCreateManyArgs>(args?: SelectSubset<T, AgentMessageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AgentMessages and returns the data saved in the database.
     * @param {AgentMessageCreateManyAndReturnArgs} args - Arguments to create many AgentMessages.
     * @example
     * // Create many AgentMessages
     * const agentMessage = await prisma.agentMessage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AgentMessages and only return the `id`
     * const agentMessageWithIdOnly = await prisma.agentMessage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AgentMessageCreateManyAndReturnArgs>(args?: SelectSubset<T, AgentMessageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AgentMessage.
     * @param {AgentMessageDeleteArgs} args - Arguments to delete one AgentMessage.
     * @example
     * // Delete one AgentMessage
     * const AgentMessage = await prisma.agentMessage.delete({
     *   where: {
     *     // ... filter to delete one AgentMessage
     *   }
     * })
     * 
     */
    delete<T extends AgentMessageDeleteArgs>(args: SelectSubset<T, AgentMessageDeleteArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AgentMessage.
     * @param {AgentMessageUpdateArgs} args - Arguments to update one AgentMessage.
     * @example
     * // Update one AgentMessage
     * const agentMessage = await prisma.agentMessage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AgentMessageUpdateArgs>(args: SelectSubset<T, AgentMessageUpdateArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AgentMessages.
     * @param {AgentMessageDeleteManyArgs} args - Arguments to filter AgentMessages to delete.
     * @example
     * // Delete a few AgentMessages
     * const { count } = await prisma.agentMessage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AgentMessageDeleteManyArgs>(args?: SelectSubset<T, AgentMessageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgentMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AgentMessages
     * const agentMessage = await prisma.agentMessage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AgentMessageUpdateManyArgs>(args: SelectSubset<T, AgentMessageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgentMessages and returns the data updated in the database.
     * @param {AgentMessageUpdateManyAndReturnArgs} args - Arguments to update many AgentMessages.
     * @example
     * // Update many AgentMessages
     * const agentMessage = await prisma.agentMessage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AgentMessages and only return the `id`
     * const agentMessageWithIdOnly = await prisma.agentMessage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AgentMessageUpdateManyAndReturnArgs>(args: SelectSubset<T, AgentMessageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AgentMessage.
     * @param {AgentMessageUpsertArgs} args - Arguments to update or create a AgentMessage.
     * @example
     * // Update or create a AgentMessage
     * const agentMessage = await prisma.agentMessage.upsert({
     *   create: {
     *     // ... data to create a AgentMessage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AgentMessage we want to update
     *   }
     * })
     */
    upsert<T extends AgentMessageUpsertArgs>(args: SelectSubset<T, AgentMessageUpsertArgs<ExtArgs>>): Prisma__AgentMessageClient<$Result.GetResult<Prisma.$AgentMessagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AgentMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageCountArgs} args - Arguments to filter AgentMessages to count.
     * @example
     * // Count the number of AgentMessages
     * const count = await prisma.agentMessage.count({
     *   where: {
     *     // ... the filter for the AgentMessages we want to count
     *   }
     * })
    **/
    count<T extends AgentMessageCountArgs>(
      args?: Subset<T, AgentMessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AgentMessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AgentMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AgentMessageAggregateArgs>(args: Subset<T, AgentMessageAggregateArgs>): Prisma.PrismaPromise<GetAgentMessageAggregateType<T>>

    /**
     * Group by AgentMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgentMessageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AgentMessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AgentMessageGroupByArgs['orderBy'] }
        : { orderBy?: AgentMessageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AgentMessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAgentMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AgentMessage model
   */
  readonly fields: AgentMessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AgentMessage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AgentMessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    session<T extends AgentSessionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AgentSessionDefaultArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AgentMessage model
   */
  interface AgentMessageFieldRefs {
    readonly id: FieldRef<"AgentMessage", 'String'>
    readonly sessionId: FieldRef<"AgentMessage", 'String'>
    readonly agentType: FieldRef<"AgentMessage", 'AgentType'>
    readonly messageContent: FieldRef<"AgentMessage", 'String'>
    readonly messageOrder: FieldRef<"AgentMessage", 'Int'>
    readonly timestamp: FieldRef<"AgentMessage", 'DateTime'>
    readonly confidence: FieldRef<"AgentMessage", 'Float'>
    readonly sources: FieldRef<"AgentMessage", 'Json'>
    readonly metadata: FieldRef<"AgentMessage", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * AgentMessage findUnique
   */
  export type AgentMessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * Filter, which AgentMessage to fetch.
     */
    where: AgentMessageWhereUniqueInput
  }

  /**
   * AgentMessage findUniqueOrThrow
   */
  export type AgentMessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * Filter, which AgentMessage to fetch.
     */
    where: AgentMessageWhereUniqueInput
  }

  /**
   * AgentMessage findFirst
   */
  export type AgentMessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * Filter, which AgentMessage to fetch.
     */
    where?: AgentMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentMessages to fetch.
     */
    orderBy?: AgentMessageOrderByWithRelationInput | AgentMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgentMessages.
     */
    cursor?: AgentMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgentMessages.
     */
    distinct?: AgentMessageScalarFieldEnum | AgentMessageScalarFieldEnum[]
  }

  /**
   * AgentMessage findFirstOrThrow
   */
  export type AgentMessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * Filter, which AgentMessage to fetch.
     */
    where?: AgentMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentMessages to fetch.
     */
    orderBy?: AgentMessageOrderByWithRelationInput | AgentMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgentMessages.
     */
    cursor?: AgentMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgentMessages.
     */
    distinct?: AgentMessageScalarFieldEnum | AgentMessageScalarFieldEnum[]
  }

  /**
   * AgentMessage findMany
   */
  export type AgentMessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * Filter, which AgentMessages to fetch.
     */
    where?: AgentMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgentMessages to fetch.
     */
    orderBy?: AgentMessageOrderByWithRelationInput | AgentMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AgentMessages.
     */
    cursor?: AgentMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgentMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgentMessages.
     */
    skip?: number
    distinct?: AgentMessageScalarFieldEnum | AgentMessageScalarFieldEnum[]
  }

  /**
   * AgentMessage create
   */
  export type AgentMessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * The data needed to create a AgentMessage.
     */
    data: XOR<AgentMessageCreateInput, AgentMessageUncheckedCreateInput>
  }

  /**
   * AgentMessage createMany
   */
  export type AgentMessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AgentMessages.
     */
    data: AgentMessageCreateManyInput | AgentMessageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AgentMessage createManyAndReturn
   */
  export type AgentMessageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * The data used to create many AgentMessages.
     */
    data: AgentMessageCreateManyInput | AgentMessageCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AgentMessage update
   */
  export type AgentMessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * The data needed to update a AgentMessage.
     */
    data: XOR<AgentMessageUpdateInput, AgentMessageUncheckedUpdateInput>
    /**
     * Choose, which AgentMessage to update.
     */
    where: AgentMessageWhereUniqueInput
  }

  /**
   * AgentMessage updateMany
   */
  export type AgentMessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AgentMessages.
     */
    data: XOR<AgentMessageUpdateManyMutationInput, AgentMessageUncheckedUpdateManyInput>
    /**
     * Filter which AgentMessages to update
     */
    where?: AgentMessageWhereInput
    /**
     * Limit how many AgentMessages to update.
     */
    limit?: number
  }

  /**
   * AgentMessage updateManyAndReturn
   */
  export type AgentMessageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * The data used to update AgentMessages.
     */
    data: XOR<AgentMessageUpdateManyMutationInput, AgentMessageUncheckedUpdateManyInput>
    /**
     * Filter which AgentMessages to update
     */
    where?: AgentMessageWhereInput
    /**
     * Limit how many AgentMessages to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AgentMessage upsert
   */
  export type AgentMessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * The filter to search for the AgentMessage to update in case it exists.
     */
    where: AgentMessageWhereUniqueInput
    /**
     * In case the AgentMessage found by the `where` argument doesn't exist, create a new AgentMessage with this data.
     */
    create: XOR<AgentMessageCreateInput, AgentMessageUncheckedCreateInput>
    /**
     * In case the AgentMessage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AgentMessageUpdateInput, AgentMessageUncheckedUpdateInput>
  }

  /**
   * AgentMessage delete
   */
  export type AgentMessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
    /**
     * Filter which AgentMessage to delete.
     */
    where: AgentMessageWhereUniqueInput
  }

  /**
   * AgentMessage deleteMany
   */
  export type AgentMessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgentMessages to delete
     */
    where?: AgentMessageWhereInput
    /**
     * Limit how many AgentMessages to delete.
     */
    limit?: number
  }

  /**
   * AgentMessage without action
   */
  export type AgentMessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgentMessage
     */
    select?: AgentMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgentMessage
     */
    omit?: AgentMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgentMessageInclude<ExtArgs> | null
  }


  /**
   * Model ConversationExport
   */

  export type AggregateConversationExport = {
    _count: ConversationExportCountAggregateOutputType | null
    _min: ConversationExportMinAggregateOutputType | null
    _max: ConversationExportMaxAggregateOutputType | null
  }

  export type ConversationExportMinAggregateOutputType = {
    id: string | null
    sessionId: string | null
    userId: string | null
    exportFormat: $Enums.ExportFormat | null
    exportedAt: Date | null
    filePath: string | null
    downloadUrl: string | null
    expiresAt: Date | null
  }

  export type ConversationExportMaxAggregateOutputType = {
    id: string | null
    sessionId: string | null
    userId: string | null
    exportFormat: $Enums.ExportFormat | null
    exportedAt: Date | null
    filePath: string | null
    downloadUrl: string | null
    expiresAt: Date | null
  }

  export type ConversationExportCountAggregateOutputType = {
    id: number
    sessionId: number
    userId: number
    exportFormat: number
    exportedAt: number
    filePath: number
    downloadUrl: number
    expiresAt: number
    _all: number
  }


  export type ConversationExportMinAggregateInputType = {
    id?: true
    sessionId?: true
    userId?: true
    exportFormat?: true
    exportedAt?: true
    filePath?: true
    downloadUrl?: true
    expiresAt?: true
  }

  export type ConversationExportMaxAggregateInputType = {
    id?: true
    sessionId?: true
    userId?: true
    exportFormat?: true
    exportedAt?: true
    filePath?: true
    downloadUrl?: true
    expiresAt?: true
  }

  export type ConversationExportCountAggregateInputType = {
    id?: true
    sessionId?: true
    userId?: true
    exportFormat?: true
    exportedAt?: true
    filePath?: true
    downloadUrl?: true
    expiresAt?: true
    _all?: true
  }

  export type ConversationExportAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConversationExport to aggregate.
     */
    where?: ConversationExportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConversationExports to fetch.
     */
    orderBy?: ConversationExportOrderByWithRelationInput | ConversationExportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConversationExportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConversationExports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConversationExports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ConversationExports
    **/
    _count?: true | ConversationExportCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConversationExportMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConversationExportMaxAggregateInputType
  }

  export type GetConversationExportAggregateType<T extends ConversationExportAggregateArgs> = {
        [P in keyof T & keyof AggregateConversationExport]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConversationExport[P]>
      : GetScalarType<T[P], AggregateConversationExport[P]>
  }




  export type ConversationExportGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConversationExportWhereInput
    orderBy?: ConversationExportOrderByWithAggregationInput | ConversationExportOrderByWithAggregationInput[]
    by: ConversationExportScalarFieldEnum[] | ConversationExportScalarFieldEnum
    having?: ConversationExportScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConversationExportCountAggregateInputType | true
    _min?: ConversationExportMinAggregateInputType
    _max?: ConversationExportMaxAggregateInputType
  }

  export type ConversationExportGroupByOutputType = {
    id: string
    sessionId: string
    userId: string | null
    exportFormat: $Enums.ExportFormat
    exportedAt: Date
    filePath: string | null
    downloadUrl: string | null
    expiresAt: Date | null
    _count: ConversationExportCountAggregateOutputType | null
    _min: ConversationExportMinAggregateOutputType | null
    _max: ConversationExportMaxAggregateOutputType | null
  }

  type GetConversationExportGroupByPayload<T extends ConversationExportGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConversationExportGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConversationExportGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConversationExportGroupByOutputType[P]>
            : GetScalarType<T[P], ConversationExportGroupByOutputType[P]>
        }
      >
    >


  export type ConversationExportSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    userId?: boolean
    exportFormat?: boolean
    exportedAt?: boolean
    filePath?: boolean
    downloadUrl?: boolean
    expiresAt?: boolean
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
    user?: boolean | ConversationExport$userArgs<ExtArgs>
  }, ExtArgs["result"]["conversationExport"]>

  export type ConversationExportSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    userId?: boolean
    exportFormat?: boolean
    exportedAt?: boolean
    filePath?: boolean
    downloadUrl?: boolean
    expiresAt?: boolean
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
    user?: boolean | ConversationExport$userArgs<ExtArgs>
  }, ExtArgs["result"]["conversationExport"]>

  export type ConversationExportSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    userId?: boolean
    exportFormat?: boolean
    exportedAt?: boolean
    filePath?: boolean
    downloadUrl?: boolean
    expiresAt?: boolean
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
    user?: boolean | ConversationExport$userArgs<ExtArgs>
  }, ExtArgs["result"]["conversationExport"]>

  export type ConversationExportSelectScalar = {
    id?: boolean
    sessionId?: boolean
    userId?: boolean
    exportFormat?: boolean
    exportedAt?: boolean
    filePath?: boolean
    downloadUrl?: boolean
    expiresAt?: boolean
  }

  export type ConversationExportOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "sessionId" | "userId" | "exportFormat" | "exportedAt" | "filePath" | "downloadUrl" | "expiresAt", ExtArgs["result"]["conversationExport"]>
  export type ConversationExportInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
    user?: boolean | ConversationExport$userArgs<ExtArgs>
  }
  export type ConversationExportIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
    user?: boolean | ConversationExport$userArgs<ExtArgs>
  }
  export type ConversationExportIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | AgentSessionDefaultArgs<ExtArgs>
    user?: boolean | ConversationExport$userArgs<ExtArgs>
  }

  export type $ConversationExportPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ConversationExport"
    objects: {
      session: Prisma.$AgentSessionPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      sessionId: string
      userId: string | null
      exportFormat: $Enums.ExportFormat
      exportedAt: Date
      filePath: string | null
      downloadUrl: string | null
      expiresAt: Date | null
    }, ExtArgs["result"]["conversationExport"]>
    composites: {}
  }

  type ConversationExportGetPayload<S extends boolean | null | undefined | ConversationExportDefaultArgs> = $Result.GetResult<Prisma.$ConversationExportPayload, S>

  type ConversationExportCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ConversationExportFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ConversationExportCountAggregateInputType | true
    }

  export interface ConversationExportDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ConversationExport'], meta: { name: 'ConversationExport' } }
    /**
     * Find zero or one ConversationExport that matches the filter.
     * @param {ConversationExportFindUniqueArgs} args - Arguments to find a ConversationExport
     * @example
     * // Get one ConversationExport
     * const conversationExport = await prisma.conversationExport.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConversationExportFindUniqueArgs>(args: SelectSubset<T, ConversationExportFindUniqueArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ConversationExport that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ConversationExportFindUniqueOrThrowArgs} args - Arguments to find a ConversationExport
     * @example
     * // Get one ConversationExport
     * const conversationExport = await prisma.conversationExport.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConversationExportFindUniqueOrThrowArgs>(args: SelectSubset<T, ConversationExportFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ConversationExport that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportFindFirstArgs} args - Arguments to find a ConversationExport
     * @example
     * // Get one ConversationExport
     * const conversationExport = await prisma.conversationExport.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConversationExportFindFirstArgs>(args?: SelectSubset<T, ConversationExportFindFirstArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ConversationExport that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportFindFirstOrThrowArgs} args - Arguments to find a ConversationExport
     * @example
     * // Get one ConversationExport
     * const conversationExport = await prisma.conversationExport.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConversationExportFindFirstOrThrowArgs>(args?: SelectSubset<T, ConversationExportFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ConversationExports that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ConversationExports
     * const conversationExports = await prisma.conversationExport.findMany()
     * 
     * // Get first 10 ConversationExports
     * const conversationExports = await prisma.conversationExport.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const conversationExportWithIdOnly = await prisma.conversationExport.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConversationExportFindManyArgs>(args?: SelectSubset<T, ConversationExportFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ConversationExport.
     * @param {ConversationExportCreateArgs} args - Arguments to create a ConversationExport.
     * @example
     * // Create one ConversationExport
     * const ConversationExport = await prisma.conversationExport.create({
     *   data: {
     *     // ... data to create a ConversationExport
     *   }
     * })
     * 
     */
    create<T extends ConversationExportCreateArgs>(args: SelectSubset<T, ConversationExportCreateArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ConversationExports.
     * @param {ConversationExportCreateManyArgs} args - Arguments to create many ConversationExports.
     * @example
     * // Create many ConversationExports
     * const conversationExport = await prisma.conversationExport.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConversationExportCreateManyArgs>(args?: SelectSubset<T, ConversationExportCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ConversationExports and returns the data saved in the database.
     * @param {ConversationExportCreateManyAndReturnArgs} args - Arguments to create many ConversationExports.
     * @example
     * // Create many ConversationExports
     * const conversationExport = await prisma.conversationExport.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ConversationExports and only return the `id`
     * const conversationExportWithIdOnly = await prisma.conversationExport.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConversationExportCreateManyAndReturnArgs>(args?: SelectSubset<T, ConversationExportCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ConversationExport.
     * @param {ConversationExportDeleteArgs} args - Arguments to delete one ConversationExport.
     * @example
     * // Delete one ConversationExport
     * const ConversationExport = await prisma.conversationExport.delete({
     *   where: {
     *     // ... filter to delete one ConversationExport
     *   }
     * })
     * 
     */
    delete<T extends ConversationExportDeleteArgs>(args: SelectSubset<T, ConversationExportDeleteArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ConversationExport.
     * @param {ConversationExportUpdateArgs} args - Arguments to update one ConversationExport.
     * @example
     * // Update one ConversationExport
     * const conversationExport = await prisma.conversationExport.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConversationExportUpdateArgs>(args: SelectSubset<T, ConversationExportUpdateArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ConversationExports.
     * @param {ConversationExportDeleteManyArgs} args - Arguments to filter ConversationExports to delete.
     * @example
     * // Delete a few ConversationExports
     * const { count } = await prisma.conversationExport.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConversationExportDeleteManyArgs>(args?: SelectSubset<T, ConversationExportDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConversationExports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ConversationExports
     * const conversationExport = await prisma.conversationExport.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConversationExportUpdateManyArgs>(args: SelectSubset<T, ConversationExportUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConversationExports and returns the data updated in the database.
     * @param {ConversationExportUpdateManyAndReturnArgs} args - Arguments to update many ConversationExports.
     * @example
     * // Update many ConversationExports
     * const conversationExport = await prisma.conversationExport.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ConversationExports and only return the `id`
     * const conversationExportWithIdOnly = await prisma.conversationExport.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ConversationExportUpdateManyAndReturnArgs>(args: SelectSubset<T, ConversationExportUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ConversationExport.
     * @param {ConversationExportUpsertArgs} args - Arguments to update or create a ConversationExport.
     * @example
     * // Update or create a ConversationExport
     * const conversationExport = await prisma.conversationExport.upsert({
     *   create: {
     *     // ... data to create a ConversationExport
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ConversationExport we want to update
     *   }
     * })
     */
    upsert<T extends ConversationExportUpsertArgs>(args: SelectSubset<T, ConversationExportUpsertArgs<ExtArgs>>): Prisma__ConversationExportClient<$Result.GetResult<Prisma.$ConversationExportPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ConversationExports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportCountArgs} args - Arguments to filter ConversationExports to count.
     * @example
     * // Count the number of ConversationExports
     * const count = await prisma.conversationExport.count({
     *   where: {
     *     // ... the filter for the ConversationExports we want to count
     *   }
     * })
    **/
    count<T extends ConversationExportCountArgs>(
      args?: Subset<T, ConversationExportCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConversationExportCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ConversationExport.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConversationExportAggregateArgs>(args: Subset<T, ConversationExportAggregateArgs>): Prisma.PrismaPromise<GetConversationExportAggregateType<T>>

    /**
     * Group by ConversationExport.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConversationExportGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConversationExportGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConversationExportGroupByArgs['orderBy'] }
        : { orderBy?: ConversationExportGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConversationExportGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConversationExportGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ConversationExport model
   */
  readonly fields: ConversationExportFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ConversationExport.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConversationExportClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    session<T extends AgentSessionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AgentSessionDefaultArgs<ExtArgs>>): Prisma__AgentSessionClient<$Result.GetResult<Prisma.$AgentSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends ConversationExport$userArgs<ExtArgs> = {}>(args?: Subset<T, ConversationExport$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ConversationExport model
   */
  interface ConversationExportFieldRefs {
    readonly id: FieldRef<"ConversationExport", 'String'>
    readonly sessionId: FieldRef<"ConversationExport", 'String'>
    readonly userId: FieldRef<"ConversationExport", 'String'>
    readonly exportFormat: FieldRef<"ConversationExport", 'ExportFormat'>
    readonly exportedAt: FieldRef<"ConversationExport", 'DateTime'>
    readonly filePath: FieldRef<"ConversationExport", 'String'>
    readonly downloadUrl: FieldRef<"ConversationExport", 'String'>
    readonly expiresAt: FieldRef<"ConversationExport", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ConversationExport findUnique
   */
  export type ConversationExportFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * Filter, which ConversationExport to fetch.
     */
    where: ConversationExportWhereUniqueInput
  }

  /**
   * ConversationExport findUniqueOrThrow
   */
  export type ConversationExportFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * Filter, which ConversationExport to fetch.
     */
    where: ConversationExportWhereUniqueInput
  }

  /**
   * ConversationExport findFirst
   */
  export type ConversationExportFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * Filter, which ConversationExport to fetch.
     */
    where?: ConversationExportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConversationExports to fetch.
     */
    orderBy?: ConversationExportOrderByWithRelationInput | ConversationExportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConversationExports.
     */
    cursor?: ConversationExportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConversationExports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConversationExports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConversationExports.
     */
    distinct?: ConversationExportScalarFieldEnum | ConversationExportScalarFieldEnum[]
  }

  /**
   * ConversationExport findFirstOrThrow
   */
  export type ConversationExportFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * Filter, which ConversationExport to fetch.
     */
    where?: ConversationExportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConversationExports to fetch.
     */
    orderBy?: ConversationExportOrderByWithRelationInput | ConversationExportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConversationExports.
     */
    cursor?: ConversationExportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConversationExports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConversationExports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConversationExports.
     */
    distinct?: ConversationExportScalarFieldEnum | ConversationExportScalarFieldEnum[]
  }

  /**
   * ConversationExport findMany
   */
  export type ConversationExportFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * Filter, which ConversationExports to fetch.
     */
    where?: ConversationExportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConversationExports to fetch.
     */
    orderBy?: ConversationExportOrderByWithRelationInput | ConversationExportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ConversationExports.
     */
    cursor?: ConversationExportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConversationExports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConversationExports.
     */
    skip?: number
    distinct?: ConversationExportScalarFieldEnum | ConversationExportScalarFieldEnum[]
  }

  /**
   * ConversationExport create
   */
  export type ConversationExportCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * The data needed to create a ConversationExport.
     */
    data: XOR<ConversationExportCreateInput, ConversationExportUncheckedCreateInput>
  }

  /**
   * ConversationExport createMany
   */
  export type ConversationExportCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ConversationExports.
     */
    data: ConversationExportCreateManyInput | ConversationExportCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ConversationExport createManyAndReturn
   */
  export type ConversationExportCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * The data used to create many ConversationExports.
     */
    data: ConversationExportCreateManyInput | ConversationExportCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ConversationExport update
   */
  export type ConversationExportUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * The data needed to update a ConversationExport.
     */
    data: XOR<ConversationExportUpdateInput, ConversationExportUncheckedUpdateInput>
    /**
     * Choose, which ConversationExport to update.
     */
    where: ConversationExportWhereUniqueInput
  }

  /**
   * ConversationExport updateMany
   */
  export type ConversationExportUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ConversationExports.
     */
    data: XOR<ConversationExportUpdateManyMutationInput, ConversationExportUncheckedUpdateManyInput>
    /**
     * Filter which ConversationExports to update
     */
    where?: ConversationExportWhereInput
    /**
     * Limit how many ConversationExports to update.
     */
    limit?: number
  }

  /**
   * ConversationExport updateManyAndReturn
   */
  export type ConversationExportUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * The data used to update ConversationExports.
     */
    data: XOR<ConversationExportUpdateManyMutationInput, ConversationExportUncheckedUpdateManyInput>
    /**
     * Filter which ConversationExports to update
     */
    where?: ConversationExportWhereInput
    /**
     * Limit how many ConversationExports to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ConversationExport upsert
   */
  export type ConversationExportUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * The filter to search for the ConversationExport to update in case it exists.
     */
    where: ConversationExportWhereUniqueInput
    /**
     * In case the ConversationExport found by the `where` argument doesn't exist, create a new ConversationExport with this data.
     */
    create: XOR<ConversationExportCreateInput, ConversationExportUncheckedCreateInput>
    /**
     * In case the ConversationExport was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConversationExportUpdateInput, ConversationExportUncheckedUpdateInput>
  }

  /**
   * ConversationExport delete
   */
  export type ConversationExportDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
    /**
     * Filter which ConversationExport to delete.
     */
    where: ConversationExportWhereUniqueInput
  }

  /**
   * ConversationExport deleteMany
   */
  export type ConversationExportDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConversationExports to delete
     */
    where?: ConversationExportWhereInput
    /**
     * Limit how many ConversationExports to delete.
     */
    limit?: number
  }

  /**
   * ConversationExport.user
   */
  export type ConversationExport$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * ConversationExport without action
   */
  export type ConversationExportDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConversationExport
     */
    select?: ConversationExportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ConversationExport
     */
    omit?: ConversationExportOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConversationExportInclude<ExtArgs> | null
  }


  /**
   * Model SignalCache
   */

  export type AggregateSignalCache = {
    _count: SignalCacheCountAggregateOutputType | null
    _avg: SignalCacheAvgAggregateOutputType | null
    _sum: SignalCacheSumAggregateOutputType | null
    _min: SignalCacheMinAggregateOutputType | null
    _max: SignalCacheMaxAggregateOutputType | null
  }

  export type SignalCacheAvgAggregateOutputType = {
    signalValue: number | null
    confidence: number | null
  }

  export type SignalCacheSumAggregateOutputType = {
    signalValue: number | null
    confidence: number | null
  }

  export type SignalCacheMinAggregateOutputType = {
    id: string | null
    signalType: string | null
    signalValue: number | null
    confidence: number | null
    timestamp: Date | null
    expiresAt: Date | null
    source: string | null
  }

  export type SignalCacheMaxAggregateOutputType = {
    id: string | null
    signalType: string | null
    signalValue: number | null
    confidence: number | null
    timestamp: Date | null
    expiresAt: Date | null
    source: string | null
  }

  export type SignalCacheCountAggregateOutputType = {
    id: number
    signalType: number
    signalValue: number
    confidence: number
    timestamp: number
    expiresAt: number
    metadata: number
    source: number
    _all: number
  }


  export type SignalCacheAvgAggregateInputType = {
    signalValue?: true
    confidence?: true
  }

  export type SignalCacheSumAggregateInputType = {
    signalValue?: true
    confidence?: true
  }

  export type SignalCacheMinAggregateInputType = {
    id?: true
    signalType?: true
    signalValue?: true
    confidence?: true
    timestamp?: true
    expiresAt?: true
    source?: true
  }

  export type SignalCacheMaxAggregateInputType = {
    id?: true
    signalType?: true
    signalValue?: true
    confidence?: true
    timestamp?: true
    expiresAt?: true
    source?: true
  }

  export type SignalCacheCountAggregateInputType = {
    id?: true
    signalType?: true
    signalValue?: true
    confidence?: true
    timestamp?: true
    expiresAt?: true
    metadata?: true
    source?: true
    _all?: true
  }

  export type SignalCacheAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SignalCache to aggregate.
     */
    where?: SignalCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SignalCaches to fetch.
     */
    orderBy?: SignalCacheOrderByWithRelationInput | SignalCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SignalCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SignalCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SignalCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SignalCaches
    **/
    _count?: true | SignalCacheCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SignalCacheAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SignalCacheSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SignalCacheMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SignalCacheMaxAggregateInputType
  }

  export type GetSignalCacheAggregateType<T extends SignalCacheAggregateArgs> = {
        [P in keyof T & keyof AggregateSignalCache]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSignalCache[P]>
      : GetScalarType<T[P], AggregateSignalCache[P]>
  }




  export type SignalCacheGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SignalCacheWhereInput
    orderBy?: SignalCacheOrderByWithAggregationInput | SignalCacheOrderByWithAggregationInput[]
    by: SignalCacheScalarFieldEnum[] | SignalCacheScalarFieldEnum
    having?: SignalCacheScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SignalCacheCountAggregateInputType | true
    _avg?: SignalCacheAvgAggregateInputType
    _sum?: SignalCacheSumAggregateInputType
    _min?: SignalCacheMinAggregateInputType
    _max?: SignalCacheMaxAggregateInputType
  }

  export type SignalCacheGroupByOutputType = {
    id: string
    signalType: string
    signalValue: number
    confidence: number
    timestamp: Date
    expiresAt: Date
    metadata: JsonValue | null
    source: string | null
    _count: SignalCacheCountAggregateOutputType | null
    _avg: SignalCacheAvgAggregateOutputType | null
    _sum: SignalCacheSumAggregateOutputType | null
    _min: SignalCacheMinAggregateOutputType | null
    _max: SignalCacheMaxAggregateOutputType | null
  }

  type GetSignalCacheGroupByPayload<T extends SignalCacheGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SignalCacheGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SignalCacheGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SignalCacheGroupByOutputType[P]>
            : GetScalarType<T[P], SignalCacheGroupByOutputType[P]>
        }
      >
    >


  export type SignalCacheSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    signalType?: boolean
    signalValue?: boolean
    confidence?: boolean
    timestamp?: boolean
    expiresAt?: boolean
    metadata?: boolean
    source?: boolean
  }, ExtArgs["result"]["signalCache"]>

  export type SignalCacheSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    signalType?: boolean
    signalValue?: boolean
    confidence?: boolean
    timestamp?: boolean
    expiresAt?: boolean
    metadata?: boolean
    source?: boolean
  }, ExtArgs["result"]["signalCache"]>

  export type SignalCacheSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    signalType?: boolean
    signalValue?: boolean
    confidence?: boolean
    timestamp?: boolean
    expiresAt?: boolean
    metadata?: boolean
    source?: boolean
  }, ExtArgs["result"]["signalCache"]>

  export type SignalCacheSelectScalar = {
    id?: boolean
    signalType?: boolean
    signalValue?: boolean
    confidence?: boolean
    timestamp?: boolean
    expiresAt?: boolean
    metadata?: boolean
    source?: boolean
  }

  export type SignalCacheOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "signalType" | "signalValue" | "confidence" | "timestamp" | "expiresAt" | "metadata" | "source", ExtArgs["result"]["signalCache"]>

  export type $SignalCachePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SignalCache"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      signalType: string
      signalValue: number
      confidence: number
      timestamp: Date
      expiresAt: Date
      metadata: Prisma.JsonValue | null
      source: string | null
    }, ExtArgs["result"]["signalCache"]>
    composites: {}
  }

  type SignalCacheGetPayload<S extends boolean | null | undefined | SignalCacheDefaultArgs> = $Result.GetResult<Prisma.$SignalCachePayload, S>

  type SignalCacheCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SignalCacheFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SignalCacheCountAggregateInputType | true
    }

  export interface SignalCacheDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SignalCache'], meta: { name: 'SignalCache' } }
    /**
     * Find zero or one SignalCache that matches the filter.
     * @param {SignalCacheFindUniqueArgs} args - Arguments to find a SignalCache
     * @example
     * // Get one SignalCache
     * const signalCache = await prisma.signalCache.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SignalCacheFindUniqueArgs>(args: SelectSubset<T, SignalCacheFindUniqueArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SignalCache that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SignalCacheFindUniqueOrThrowArgs} args - Arguments to find a SignalCache
     * @example
     * // Get one SignalCache
     * const signalCache = await prisma.signalCache.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SignalCacheFindUniqueOrThrowArgs>(args: SelectSubset<T, SignalCacheFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SignalCache that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheFindFirstArgs} args - Arguments to find a SignalCache
     * @example
     * // Get one SignalCache
     * const signalCache = await prisma.signalCache.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SignalCacheFindFirstArgs>(args?: SelectSubset<T, SignalCacheFindFirstArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SignalCache that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheFindFirstOrThrowArgs} args - Arguments to find a SignalCache
     * @example
     * // Get one SignalCache
     * const signalCache = await prisma.signalCache.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SignalCacheFindFirstOrThrowArgs>(args?: SelectSubset<T, SignalCacheFindFirstOrThrowArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SignalCaches that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SignalCaches
     * const signalCaches = await prisma.signalCache.findMany()
     * 
     * // Get first 10 SignalCaches
     * const signalCaches = await prisma.signalCache.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const signalCacheWithIdOnly = await prisma.signalCache.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SignalCacheFindManyArgs>(args?: SelectSubset<T, SignalCacheFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SignalCache.
     * @param {SignalCacheCreateArgs} args - Arguments to create a SignalCache.
     * @example
     * // Create one SignalCache
     * const SignalCache = await prisma.signalCache.create({
     *   data: {
     *     // ... data to create a SignalCache
     *   }
     * })
     * 
     */
    create<T extends SignalCacheCreateArgs>(args: SelectSubset<T, SignalCacheCreateArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SignalCaches.
     * @param {SignalCacheCreateManyArgs} args - Arguments to create many SignalCaches.
     * @example
     * // Create many SignalCaches
     * const signalCache = await prisma.signalCache.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SignalCacheCreateManyArgs>(args?: SelectSubset<T, SignalCacheCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SignalCaches and returns the data saved in the database.
     * @param {SignalCacheCreateManyAndReturnArgs} args - Arguments to create many SignalCaches.
     * @example
     * // Create many SignalCaches
     * const signalCache = await prisma.signalCache.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SignalCaches and only return the `id`
     * const signalCacheWithIdOnly = await prisma.signalCache.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SignalCacheCreateManyAndReturnArgs>(args?: SelectSubset<T, SignalCacheCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SignalCache.
     * @param {SignalCacheDeleteArgs} args - Arguments to delete one SignalCache.
     * @example
     * // Delete one SignalCache
     * const SignalCache = await prisma.signalCache.delete({
     *   where: {
     *     // ... filter to delete one SignalCache
     *   }
     * })
     * 
     */
    delete<T extends SignalCacheDeleteArgs>(args: SelectSubset<T, SignalCacheDeleteArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SignalCache.
     * @param {SignalCacheUpdateArgs} args - Arguments to update one SignalCache.
     * @example
     * // Update one SignalCache
     * const signalCache = await prisma.signalCache.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SignalCacheUpdateArgs>(args: SelectSubset<T, SignalCacheUpdateArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SignalCaches.
     * @param {SignalCacheDeleteManyArgs} args - Arguments to filter SignalCaches to delete.
     * @example
     * // Delete a few SignalCaches
     * const { count } = await prisma.signalCache.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SignalCacheDeleteManyArgs>(args?: SelectSubset<T, SignalCacheDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SignalCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SignalCaches
     * const signalCache = await prisma.signalCache.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SignalCacheUpdateManyArgs>(args: SelectSubset<T, SignalCacheUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SignalCaches and returns the data updated in the database.
     * @param {SignalCacheUpdateManyAndReturnArgs} args - Arguments to update many SignalCaches.
     * @example
     * // Update many SignalCaches
     * const signalCache = await prisma.signalCache.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SignalCaches and only return the `id`
     * const signalCacheWithIdOnly = await prisma.signalCache.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SignalCacheUpdateManyAndReturnArgs>(args: SelectSubset<T, SignalCacheUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SignalCache.
     * @param {SignalCacheUpsertArgs} args - Arguments to update or create a SignalCache.
     * @example
     * // Update or create a SignalCache
     * const signalCache = await prisma.signalCache.upsert({
     *   create: {
     *     // ... data to create a SignalCache
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SignalCache we want to update
     *   }
     * })
     */
    upsert<T extends SignalCacheUpsertArgs>(args: SelectSubset<T, SignalCacheUpsertArgs<ExtArgs>>): Prisma__SignalCacheClient<$Result.GetResult<Prisma.$SignalCachePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SignalCaches.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheCountArgs} args - Arguments to filter SignalCaches to count.
     * @example
     * // Count the number of SignalCaches
     * const count = await prisma.signalCache.count({
     *   where: {
     *     // ... the filter for the SignalCaches we want to count
     *   }
     * })
    **/
    count<T extends SignalCacheCountArgs>(
      args?: Subset<T, SignalCacheCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SignalCacheCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SignalCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SignalCacheAggregateArgs>(args: Subset<T, SignalCacheAggregateArgs>): Prisma.PrismaPromise<GetSignalCacheAggregateType<T>>

    /**
     * Group by SignalCache.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SignalCacheGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SignalCacheGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SignalCacheGroupByArgs['orderBy'] }
        : { orderBy?: SignalCacheGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SignalCacheGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSignalCacheGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SignalCache model
   */
  readonly fields: SignalCacheFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SignalCache.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SignalCacheClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SignalCache model
   */
  interface SignalCacheFieldRefs {
    readonly id: FieldRef<"SignalCache", 'String'>
    readonly signalType: FieldRef<"SignalCache", 'String'>
    readonly signalValue: FieldRef<"SignalCache", 'Float'>
    readonly confidence: FieldRef<"SignalCache", 'Float'>
    readonly timestamp: FieldRef<"SignalCache", 'DateTime'>
    readonly expiresAt: FieldRef<"SignalCache", 'DateTime'>
    readonly metadata: FieldRef<"SignalCache", 'Json'>
    readonly source: FieldRef<"SignalCache", 'String'>
  }
    

  // Custom InputTypes
  /**
   * SignalCache findUnique
   */
  export type SignalCacheFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * Filter, which SignalCache to fetch.
     */
    where: SignalCacheWhereUniqueInput
  }

  /**
   * SignalCache findUniqueOrThrow
   */
  export type SignalCacheFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * Filter, which SignalCache to fetch.
     */
    where: SignalCacheWhereUniqueInput
  }

  /**
   * SignalCache findFirst
   */
  export type SignalCacheFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * Filter, which SignalCache to fetch.
     */
    where?: SignalCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SignalCaches to fetch.
     */
    orderBy?: SignalCacheOrderByWithRelationInput | SignalCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SignalCaches.
     */
    cursor?: SignalCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SignalCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SignalCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SignalCaches.
     */
    distinct?: SignalCacheScalarFieldEnum | SignalCacheScalarFieldEnum[]
  }

  /**
   * SignalCache findFirstOrThrow
   */
  export type SignalCacheFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * Filter, which SignalCache to fetch.
     */
    where?: SignalCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SignalCaches to fetch.
     */
    orderBy?: SignalCacheOrderByWithRelationInput | SignalCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SignalCaches.
     */
    cursor?: SignalCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SignalCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SignalCaches.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SignalCaches.
     */
    distinct?: SignalCacheScalarFieldEnum | SignalCacheScalarFieldEnum[]
  }

  /**
   * SignalCache findMany
   */
  export type SignalCacheFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * Filter, which SignalCaches to fetch.
     */
    where?: SignalCacheWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SignalCaches to fetch.
     */
    orderBy?: SignalCacheOrderByWithRelationInput | SignalCacheOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SignalCaches.
     */
    cursor?: SignalCacheWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SignalCaches from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SignalCaches.
     */
    skip?: number
    distinct?: SignalCacheScalarFieldEnum | SignalCacheScalarFieldEnum[]
  }

  /**
   * SignalCache create
   */
  export type SignalCacheCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * The data needed to create a SignalCache.
     */
    data: XOR<SignalCacheCreateInput, SignalCacheUncheckedCreateInput>
  }

  /**
   * SignalCache createMany
   */
  export type SignalCacheCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SignalCaches.
     */
    data: SignalCacheCreateManyInput | SignalCacheCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SignalCache createManyAndReturn
   */
  export type SignalCacheCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * The data used to create many SignalCaches.
     */
    data: SignalCacheCreateManyInput | SignalCacheCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SignalCache update
   */
  export type SignalCacheUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * The data needed to update a SignalCache.
     */
    data: XOR<SignalCacheUpdateInput, SignalCacheUncheckedUpdateInput>
    /**
     * Choose, which SignalCache to update.
     */
    where: SignalCacheWhereUniqueInput
  }

  /**
   * SignalCache updateMany
   */
  export type SignalCacheUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SignalCaches.
     */
    data: XOR<SignalCacheUpdateManyMutationInput, SignalCacheUncheckedUpdateManyInput>
    /**
     * Filter which SignalCaches to update
     */
    where?: SignalCacheWhereInput
    /**
     * Limit how many SignalCaches to update.
     */
    limit?: number
  }

  /**
   * SignalCache updateManyAndReturn
   */
  export type SignalCacheUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * The data used to update SignalCaches.
     */
    data: XOR<SignalCacheUpdateManyMutationInput, SignalCacheUncheckedUpdateManyInput>
    /**
     * Filter which SignalCaches to update
     */
    where?: SignalCacheWhereInput
    /**
     * Limit how many SignalCaches to update.
     */
    limit?: number
  }

  /**
   * SignalCache upsert
   */
  export type SignalCacheUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * The filter to search for the SignalCache to update in case it exists.
     */
    where: SignalCacheWhereUniqueInput
    /**
     * In case the SignalCache found by the `where` argument doesn't exist, create a new SignalCache with this data.
     */
    create: XOR<SignalCacheCreateInput, SignalCacheUncheckedCreateInput>
    /**
     * In case the SignalCache was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SignalCacheUpdateInput, SignalCacheUncheckedUpdateInput>
  }

  /**
   * SignalCache delete
   */
  export type SignalCacheDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
    /**
     * Filter which SignalCache to delete.
     */
    where: SignalCacheWhereUniqueInput
  }

  /**
   * SignalCache deleteMany
   */
  export type SignalCacheDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SignalCaches to delete
     */
    where?: SignalCacheWhereInput
    /**
     * Limit how many SignalCaches to delete.
     */
    limit?: number
  }

  /**
   * SignalCache without action
   */
  export type SignalCacheDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SignalCache
     */
    select?: SignalCacheSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SignalCache
     */
    omit?: SignalCacheOmit<ExtArgs> | null
  }


  /**
   * Model UserSubscription
   */

  export type AggregateUserSubscription = {
    _count: UserSubscriptionCountAggregateOutputType | null
    _min: UserSubscriptionMinAggregateOutputType | null
    _max: UserSubscriptionMaxAggregateOutputType | null
  }

  export type UserSubscriptionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    subscriptionType: string | null
    status: string | null
    startDate: Date | null
    endDate: Date | null
  }

  export type UserSubscriptionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    subscriptionType: string | null
    status: string | null
    startDate: Date | null
    endDate: Date | null
  }

  export type UserSubscriptionCountAggregateOutputType = {
    id: number
    userId: number
    subscriptionType: number
    status: number
    startDate: number
    endDate: number
    metadata: number
    _all: number
  }


  export type UserSubscriptionMinAggregateInputType = {
    id?: true
    userId?: true
    subscriptionType?: true
    status?: true
    startDate?: true
    endDate?: true
  }

  export type UserSubscriptionMaxAggregateInputType = {
    id?: true
    userId?: true
    subscriptionType?: true
    status?: true
    startDate?: true
    endDate?: true
  }

  export type UserSubscriptionCountAggregateInputType = {
    id?: true
    userId?: true
    subscriptionType?: true
    status?: true
    startDate?: true
    endDate?: true
    metadata?: true
    _all?: true
  }

  export type UserSubscriptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSubscription to aggregate.
     */
    where?: UserSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSubscriptions to fetch.
     */
    orderBy?: UserSubscriptionOrderByWithRelationInput | UserSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSubscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserSubscriptions
    **/
    _count?: true | UserSubscriptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserSubscriptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserSubscriptionMaxAggregateInputType
  }

  export type GetUserSubscriptionAggregateType<T extends UserSubscriptionAggregateArgs> = {
        [P in keyof T & keyof AggregateUserSubscription]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserSubscription[P]>
      : GetScalarType<T[P], AggregateUserSubscription[P]>
  }




  export type UserSubscriptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserSubscriptionWhereInput
    orderBy?: UserSubscriptionOrderByWithAggregationInput | UserSubscriptionOrderByWithAggregationInput[]
    by: UserSubscriptionScalarFieldEnum[] | UserSubscriptionScalarFieldEnum
    having?: UserSubscriptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserSubscriptionCountAggregateInputType | true
    _min?: UserSubscriptionMinAggregateInputType
    _max?: UserSubscriptionMaxAggregateInputType
  }

  export type UserSubscriptionGroupByOutputType = {
    id: string
    userId: string
    subscriptionType: string
    status: string
    startDate: Date
    endDate: Date | null
    metadata: JsonValue | null
    _count: UserSubscriptionCountAggregateOutputType | null
    _min: UserSubscriptionMinAggregateOutputType | null
    _max: UserSubscriptionMaxAggregateOutputType | null
  }

  type GetUserSubscriptionGroupByPayload<T extends UserSubscriptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserSubscriptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserSubscriptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserSubscriptionGroupByOutputType[P]>
            : GetScalarType<T[P], UserSubscriptionGroupByOutputType[P]>
        }
      >
    >


  export type UserSubscriptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    subscriptionType?: boolean
    status?: boolean
    startDate?: boolean
    endDate?: boolean
    metadata?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSubscription"]>

  export type UserSubscriptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    subscriptionType?: boolean
    status?: boolean
    startDate?: boolean
    endDate?: boolean
    metadata?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSubscription"]>

  export type UserSubscriptionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    subscriptionType?: boolean
    status?: boolean
    startDate?: boolean
    endDate?: boolean
    metadata?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userSubscription"]>

  export type UserSubscriptionSelectScalar = {
    id?: boolean
    userId?: boolean
    subscriptionType?: boolean
    status?: boolean
    startDate?: boolean
    endDate?: boolean
    metadata?: boolean
  }

  export type UserSubscriptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "subscriptionType" | "status" | "startDate" | "endDate" | "metadata", ExtArgs["result"]["userSubscription"]>
  export type UserSubscriptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSubscriptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UserSubscriptionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UserSubscriptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserSubscription"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      subscriptionType: string
      status: string
      startDate: Date
      endDate: Date | null
      metadata: Prisma.JsonValue | null
    }, ExtArgs["result"]["userSubscription"]>
    composites: {}
  }

  type UserSubscriptionGetPayload<S extends boolean | null | undefined | UserSubscriptionDefaultArgs> = $Result.GetResult<Prisma.$UserSubscriptionPayload, S>

  type UserSubscriptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserSubscriptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserSubscriptionCountAggregateInputType | true
    }

  export interface UserSubscriptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserSubscription'], meta: { name: 'UserSubscription' } }
    /**
     * Find zero or one UserSubscription that matches the filter.
     * @param {UserSubscriptionFindUniqueArgs} args - Arguments to find a UserSubscription
     * @example
     * // Get one UserSubscription
     * const userSubscription = await prisma.userSubscription.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserSubscriptionFindUniqueArgs>(args: SelectSubset<T, UserSubscriptionFindUniqueArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserSubscription that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserSubscriptionFindUniqueOrThrowArgs} args - Arguments to find a UserSubscription
     * @example
     * // Get one UserSubscription
     * const userSubscription = await prisma.userSubscription.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserSubscriptionFindUniqueOrThrowArgs>(args: SelectSubset<T, UserSubscriptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSubscription that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionFindFirstArgs} args - Arguments to find a UserSubscription
     * @example
     * // Get one UserSubscription
     * const userSubscription = await prisma.userSubscription.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserSubscriptionFindFirstArgs>(args?: SelectSubset<T, UserSubscriptionFindFirstArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserSubscription that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionFindFirstOrThrowArgs} args - Arguments to find a UserSubscription
     * @example
     * // Get one UserSubscription
     * const userSubscription = await prisma.userSubscription.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserSubscriptionFindFirstOrThrowArgs>(args?: SelectSubset<T, UserSubscriptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserSubscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserSubscriptions
     * const userSubscriptions = await prisma.userSubscription.findMany()
     * 
     * // Get first 10 UserSubscriptions
     * const userSubscriptions = await prisma.userSubscription.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userSubscriptionWithIdOnly = await prisma.userSubscription.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserSubscriptionFindManyArgs>(args?: SelectSubset<T, UserSubscriptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserSubscription.
     * @param {UserSubscriptionCreateArgs} args - Arguments to create a UserSubscription.
     * @example
     * // Create one UserSubscription
     * const UserSubscription = await prisma.userSubscription.create({
     *   data: {
     *     // ... data to create a UserSubscription
     *   }
     * })
     * 
     */
    create<T extends UserSubscriptionCreateArgs>(args: SelectSubset<T, UserSubscriptionCreateArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserSubscriptions.
     * @param {UserSubscriptionCreateManyArgs} args - Arguments to create many UserSubscriptions.
     * @example
     * // Create many UserSubscriptions
     * const userSubscription = await prisma.userSubscription.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserSubscriptionCreateManyArgs>(args?: SelectSubset<T, UserSubscriptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserSubscriptions and returns the data saved in the database.
     * @param {UserSubscriptionCreateManyAndReturnArgs} args - Arguments to create many UserSubscriptions.
     * @example
     * // Create many UserSubscriptions
     * const userSubscription = await prisma.userSubscription.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserSubscriptions and only return the `id`
     * const userSubscriptionWithIdOnly = await prisma.userSubscription.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserSubscriptionCreateManyAndReturnArgs>(args?: SelectSubset<T, UserSubscriptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserSubscription.
     * @param {UserSubscriptionDeleteArgs} args - Arguments to delete one UserSubscription.
     * @example
     * // Delete one UserSubscription
     * const UserSubscription = await prisma.userSubscription.delete({
     *   where: {
     *     // ... filter to delete one UserSubscription
     *   }
     * })
     * 
     */
    delete<T extends UserSubscriptionDeleteArgs>(args: SelectSubset<T, UserSubscriptionDeleteArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserSubscription.
     * @param {UserSubscriptionUpdateArgs} args - Arguments to update one UserSubscription.
     * @example
     * // Update one UserSubscription
     * const userSubscription = await prisma.userSubscription.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserSubscriptionUpdateArgs>(args: SelectSubset<T, UserSubscriptionUpdateArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserSubscriptions.
     * @param {UserSubscriptionDeleteManyArgs} args - Arguments to filter UserSubscriptions to delete.
     * @example
     * // Delete a few UserSubscriptions
     * const { count } = await prisma.userSubscription.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserSubscriptionDeleteManyArgs>(args?: SelectSubset<T, UserSubscriptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSubscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserSubscriptions
     * const userSubscription = await prisma.userSubscription.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserSubscriptionUpdateManyArgs>(args: SelectSubset<T, UserSubscriptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserSubscriptions and returns the data updated in the database.
     * @param {UserSubscriptionUpdateManyAndReturnArgs} args - Arguments to update many UserSubscriptions.
     * @example
     * // Update many UserSubscriptions
     * const userSubscription = await prisma.userSubscription.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserSubscriptions and only return the `id`
     * const userSubscriptionWithIdOnly = await prisma.userSubscription.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserSubscriptionUpdateManyAndReturnArgs>(args: SelectSubset<T, UserSubscriptionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserSubscription.
     * @param {UserSubscriptionUpsertArgs} args - Arguments to update or create a UserSubscription.
     * @example
     * // Update or create a UserSubscription
     * const userSubscription = await prisma.userSubscription.upsert({
     *   create: {
     *     // ... data to create a UserSubscription
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserSubscription we want to update
     *   }
     * })
     */
    upsert<T extends UserSubscriptionUpsertArgs>(args: SelectSubset<T, UserSubscriptionUpsertArgs<ExtArgs>>): Prisma__UserSubscriptionClient<$Result.GetResult<Prisma.$UserSubscriptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserSubscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionCountArgs} args - Arguments to filter UserSubscriptions to count.
     * @example
     * // Count the number of UserSubscriptions
     * const count = await prisma.userSubscription.count({
     *   where: {
     *     // ... the filter for the UserSubscriptions we want to count
     *   }
     * })
    **/
    count<T extends UserSubscriptionCountArgs>(
      args?: Subset<T, UserSubscriptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserSubscriptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserSubscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserSubscriptionAggregateArgs>(args: Subset<T, UserSubscriptionAggregateArgs>): Prisma.PrismaPromise<GetUserSubscriptionAggregateType<T>>

    /**
     * Group by UserSubscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserSubscriptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserSubscriptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserSubscriptionGroupByArgs['orderBy'] }
        : { orderBy?: UserSubscriptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserSubscriptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserSubscriptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserSubscription model
   */
  readonly fields: UserSubscriptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserSubscription.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserSubscriptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserSubscription model
   */
  interface UserSubscriptionFieldRefs {
    readonly id: FieldRef<"UserSubscription", 'String'>
    readonly userId: FieldRef<"UserSubscription", 'String'>
    readonly subscriptionType: FieldRef<"UserSubscription", 'String'>
    readonly status: FieldRef<"UserSubscription", 'String'>
    readonly startDate: FieldRef<"UserSubscription", 'DateTime'>
    readonly endDate: FieldRef<"UserSubscription", 'DateTime'>
    readonly metadata: FieldRef<"UserSubscription", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * UserSubscription findUnique
   */
  export type UserSubscriptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which UserSubscription to fetch.
     */
    where: UserSubscriptionWhereUniqueInput
  }

  /**
   * UserSubscription findUniqueOrThrow
   */
  export type UserSubscriptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which UserSubscription to fetch.
     */
    where: UserSubscriptionWhereUniqueInput
  }

  /**
   * UserSubscription findFirst
   */
  export type UserSubscriptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which UserSubscription to fetch.
     */
    where?: UserSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSubscriptions to fetch.
     */
    orderBy?: UserSubscriptionOrderByWithRelationInput | UserSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSubscriptions.
     */
    cursor?: UserSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSubscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSubscriptions.
     */
    distinct?: UserSubscriptionScalarFieldEnum | UserSubscriptionScalarFieldEnum[]
  }

  /**
   * UserSubscription findFirstOrThrow
   */
  export type UserSubscriptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which UserSubscription to fetch.
     */
    where?: UserSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSubscriptions to fetch.
     */
    orderBy?: UserSubscriptionOrderByWithRelationInput | UserSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserSubscriptions.
     */
    cursor?: UserSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSubscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserSubscriptions.
     */
    distinct?: UserSubscriptionScalarFieldEnum | UserSubscriptionScalarFieldEnum[]
  }

  /**
   * UserSubscription findMany
   */
  export type UserSubscriptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which UserSubscriptions to fetch.
     */
    where?: UserSubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserSubscriptions to fetch.
     */
    orderBy?: UserSubscriptionOrderByWithRelationInput | UserSubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserSubscriptions.
     */
    cursor?: UserSubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserSubscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserSubscriptions.
     */
    skip?: number
    distinct?: UserSubscriptionScalarFieldEnum | UserSubscriptionScalarFieldEnum[]
  }

  /**
   * UserSubscription create
   */
  export type UserSubscriptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to create a UserSubscription.
     */
    data: XOR<UserSubscriptionCreateInput, UserSubscriptionUncheckedCreateInput>
  }

  /**
   * UserSubscription createMany
   */
  export type UserSubscriptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserSubscriptions.
     */
    data: UserSubscriptionCreateManyInput | UserSubscriptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserSubscription createManyAndReturn
   */
  export type UserSubscriptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * The data used to create many UserSubscriptions.
     */
    data: UserSubscriptionCreateManyInput | UserSubscriptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSubscription update
   */
  export type UserSubscriptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to update a UserSubscription.
     */
    data: XOR<UserSubscriptionUpdateInput, UserSubscriptionUncheckedUpdateInput>
    /**
     * Choose, which UserSubscription to update.
     */
    where: UserSubscriptionWhereUniqueInput
  }

  /**
   * UserSubscription updateMany
   */
  export type UserSubscriptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserSubscriptions.
     */
    data: XOR<UserSubscriptionUpdateManyMutationInput, UserSubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which UserSubscriptions to update
     */
    where?: UserSubscriptionWhereInput
    /**
     * Limit how many UserSubscriptions to update.
     */
    limit?: number
  }

  /**
   * UserSubscription updateManyAndReturn
   */
  export type UserSubscriptionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * The data used to update UserSubscriptions.
     */
    data: XOR<UserSubscriptionUpdateManyMutationInput, UserSubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which UserSubscriptions to update
     */
    where?: UserSubscriptionWhereInput
    /**
     * Limit how many UserSubscriptions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserSubscription upsert
   */
  export type UserSubscriptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * The filter to search for the UserSubscription to update in case it exists.
     */
    where: UserSubscriptionWhereUniqueInput
    /**
     * In case the UserSubscription found by the `where` argument doesn't exist, create a new UserSubscription with this data.
     */
    create: XOR<UserSubscriptionCreateInput, UserSubscriptionUncheckedCreateInput>
    /**
     * In case the UserSubscription was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserSubscriptionUpdateInput, UserSubscriptionUncheckedUpdateInput>
  }

  /**
   * UserSubscription delete
   */
  export type UserSubscriptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
    /**
     * Filter which UserSubscription to delete.
     */
    where: UserSubscriptionWhereUniqueInput
  }

  /**
   * UserSubscription deleteMany
   */
  export type UserSubscriptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserSubscriptions to delete
     */
    where?: UserSubscriptionWhereInput
    /**
     * Limit how many UserSubscriptions to delete.
     */
    limit?: number
  }

  /**
   * UserSubscription without action
   */
  export type UserSubscriptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserSubscription
     */
    select?: UserSubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserSubscription
     */
    omit?: UserSubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserSubscriptionInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    clerkUserId: 'clerkUserId',
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    imageUrl: 'imageUrl',
    isActive: 'isActive',
    preferences: 'preferences',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    lastLoginAt: 'lastLoginAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const AgentSessionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    sessionTitle: 'sessionTitle',
    contentType: 'contentType',
    contentSource: 'contentSource',
    contentUrl: 'contentUrl',
    contentText: 'contentText',
    status: 'status',
    startedAt: 'startedAt',
    completedAt: 'completedAt',
    metadata: 'metadata'
  };

  export type AgentSessionScalarFieldEnum = (typeof AgentSessionScalarFieldEnum)[keyof typeof AgentSessionScalarFieldEnum]


  export const AgentMessageScalarFieldEnum: {
    id: 'id',
    sessionId: 'sessionId',
    agentType: 'agentType',
    messageContent: 'messageContent',
    messageOrder: 'messageOrder',
    timestamp: 'timestamp',
    confidence: 'confidence',
    sources: 'sources',
    metadata: 'metadata'
  };

  export type AgentMessageScalarFieldEnum = (typeof AgentMessageScalarFieldEnum)[keyof typeof AgentMessageScalarFieldEnum]


  export const ConversationExportScalarFieldEnum: {
    id: 'id',
    sessionId: 'sessionId',
    userId: 'userId',
    exportFormat: 'exportFormat',
    exportedAt: 'exportedAt',
    filePath: 'filePath',
    downloadUrl: 'downloadUrl',
    expiresAt: 'expiresAt'
  };

  export type ConversationExportScalarFieldEnum = (typeof ConversationExportScalarFieldEnum)[keyof typeof ConversationExportScalarFieldEnum]


  export const SignalCacheScalarFieldEnum: {
    id: 'id',
    signalType: 'signalType',
    signalValue: 'signalValue',
    confidence: 'confidence',
    timestamp: 'timestamp',
    expiresAt: 'expiresAt',
    metadata: 'metadata',
    source: 'source'
  };

  export type SignalCacheScalarFieldEnum = (typeof SignalCacheScalarFieldEnum)[keyof typeof SignalCacheScalarFieldEnum]


  export const UserSubscriptionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    subscriptionType: 'subscriptionType',
    status: 'status',
    startDate: 'startDate',
    endDate: 'endDate',
    metadata: 'metadata'
  };

  export type UserSubscriptionScalarFieldEnum = (typeof UserSubscriptionScalarFieldEnum)[keyof typeof UserSubscriptionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'ContentType'
   */
  export type EnumContentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ContentType'>
    


  /**
   * Reference to a field of type 'ContentType[]'
   */
  export type ListEnumContentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ContentType[]'>
    


  /**
   * Reference to a field of type 'SessionStatus'
   */
  export type EnumSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SessionStatus'>
    


  /**
   * Reference to a field of type 'SessionStatus[]'
   */
  export type ListEnumSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SessionStatus[]'>
    


  /**
   * Reference to a field of type 'AgentType'
   */
  export type EnumAgentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AgentType'>
    


  /**
   * Reference to a field of type 'AgentType[]'
   */
  export type ListEnumAgentTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AgentType[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'ExportFormat'
   */
  export type EnumExportFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ExportFormat'>
    


  /**
   * Reference to a field of type 'ExportFormat[]'
   */
  export type ListEnumExportFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ExportFormat[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: UuidFilter<"User"> | string
    clerkUserId?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    firstName?: StringNullableFilter<"User"> | string | null
    lastName?: StringNullableFilter<"User"> | string | null
    imageUrl?: StringNullableFilter<"User"> | string | null
    isActive?: BoolFilter<"User"> | boolean
    preferences?: JsonNullableFilter<"User">
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    agentSessions?: AgentSessionListRelationFilter
    conversationExports?: ConversationExportListRelationFilter
    userSubscriptions?: UserSubscriptionListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    email?: SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    imageUrl?: SortOrderInput | SortOrder
    isActive?: SortOrder
    preferences?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    agentSessions?: AgentSessionOrderByRelationAggregateInput
    conversationExports?: ConversationExportOrderByRelationAggregateInput
    userSubscriptions?: UserSubscriptionOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    clerkUserId?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    firstName?: StringNullableFilter<"User"> | string | null
    lastName?: StringNullableFilter<"User"> | string | null
    imageUrl?: StringNullableFilter<"User"> | string | null
    isActive?: BoolFilter<"User"> | boolean
    preferences?: JsonNullableFilter<"User">
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    agentSessions?: AgentSessionListRelationFilter
    conversationExports?: ConversationExportListRelationFilter
    userSubscriptions?: UserSubscriptionListRelationFilter
  }, "id" | "clerkUserId" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    email?: SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    imageUrl?: SortOrderInput | SortOrder
    isActive?: SortOrder
    preferences?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"User"> | string
    clerkUserId?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    firstName?: StringNullableWithAggregatesFilter<"User"> | string | null
    lastName?: StringNullableWithAggregatesFilter<"User"> | string | null
    imageUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    isActive?: BoolWithAggregatesFilter<"User"> | boolean
    preferences?: JsonNullableWithAggregatesFilter<"User">
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
  }

  export type AgentSessionWhereInput = {
    AND?: AgentSessionWhereInput | AgentSessionWhereInput[]
    OR?: AgentSessionWhereInput[]
    NOT?: AgentSessionWhereInput | AgentSessionWhereInput[]
    id?: UuidFilter<"AgentSession"> | string
    userId?: UuidNullableFilter<"AgentSession"> | string | null
    sessionTitle?: StringFilter<"AgentSession"> | string
    contentType?: EnumContentTypeFilter<"AgentSession"> | $Enums.ContentType
    contentSource?: StringFilter<"AgentSession"> | string
    contentUrl?: StringNullableFilter<"AgentSession"> | string | null
    contentText?: StringFilter<"AgentSession"> | string
    status?: EnumSessionStatusFilter<"AgentSession"> | $Enums.SessionStatus
    startedAt?: DateTimeFilter<"AgentSession"> | Date | string
    completedAt?: DateTimeNullableFilter<"AgentSession"> | Date | string | null
    metadata?: JsonNullableFilter<"AgentSession">
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    messages?: AgentMessageListRelationFilter
    exports?: ConversationExportListRelationFilter
  }

  export type AgentSessionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    sessionTitle?: SortOrder
    contentType?: SortOrder
    contentSource?: SortOrder
    contentUrl?: SortOrderInput | SortOrder
    contentText?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
    messages?: AgentMessageOrderByRelationAggregateInput
    exports?: ConversationExportOrderByRelationAggregateInput
  }

  export type AgentSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AgentSessionWhereInput | AgentSessionWhereInput[]
    OR?: AgentSessionWhereInput[]
    NOT?: AgentSessionWhereInput | AgentSessionWhereInput[]
    userId?: UuidNullableFilter<"AgentSession"> | string | null
    sessionTitle?: StringFilter<"AgentSession"> | string
    contentType?: EnumContentTypeFilter<"AgentSession"> | $Enums.ContentType
    contentSource?: StringFilter<"AgentSession"> | string
    contentUrl?: StringNullableFilter<"AgentSession"> | string | null
    contentText?: StringFilter<"AgentSession"> | string
    status?: EnumSessionStatusFilter<"AgentSession"> | $Enums.SessionStatus
    startedAt?: DateTimeFilter<"AgentSession"> | Date | string
    completedAt?: DateTimeNullableFilter<"AgentSession"> | Date | string | null
    metadata?: JsonNullableFilter<"AgentSession">
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    messages?: AgentMessageListRelationFilter
    exports?: ConversationExportListRelationFilter
  }, "id">

  export type AgentSessionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    sessionTitle?: SortOrder
    contentType?: SortOrder
    contentSource?: SortOrder
    contentUrl?: SortOrderInput | SortOrder
    contentText?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    _count?: AgentSessionCountOrderByAggregateInput
    _max?: AgentSessionMaxOrderByAggregateInput
    _min?: AgentSessionMinOrderByAggregateInput
  }

  export type AgentSessionScalarWhereWithAggregatesInput = {
    AND?: AgentSessionScalarWhereWithAggregatesInput | AgentSessionScalarWhereWithAggregatesInput[]
    OR?: AgentSessionScalarWhereWithAggregatesInput[]
    NOT?: AgentSessionScalarWhereWithAggregatesInput | AgentSessionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AgentSession"> | string
    userId?: UuidNullableWithAggregatesFilter<"AgentSession"> | string | null
    sessionTitle?: StringWithAggregatesFilter<"AgentSession"> | string
    contentType?: EnumContentTypeWithAggregatesFilter<"AgentSession"> | $Enums.ContentType
    contentSource?: StringWithAggregatesFilter<"AgentSession"> | string
    contentUrl?: StringNullableWithAggregatesFilter<"AgentSession"> | string | null
    contentText?: StringWithAggregatesFilter<"AgentSession"> | string
    status?: EnumSessionStatusWithAggregatesFilter<"AgentSession"> | $Enums.SessionStatus
    startedAt?: DateTimeWithAggregatesFilter<"AgentSession"> | Date | string
    completedAt?: DateTimeNullableWithAggregatesFilter<"AgentSession"> | Date | string | null
    metadata?: JsonNullableWithAggregatesFilter<"AgentSession">
  }

  export type AgentMessageWhereInput = {
    AND?: AgentMessageWhereInput | AgentMessageWhereInput[]
    OR?: AgentMessageWhereInput[]
    NOT?: AgentMessageWhereInput | AgentMessageWhereInput[]
    id?: UuidFilter<"AgentMessage"> | string
    sessionId?: UuidFilter<"AgentMessage"> | string
    agentType?: EnumAgentTypeFilter<"AgentMessage"> | $Enums.AgentType
    messageContent?: StringFilter<"AgentMessage"> | string
    messageOrder?: IntFilter<"AgentMessage"> | number
    timestamp?: DateTimeFilter<"AgentMessage"> | Date | string
    confidence?: FloatNullableFilter<"AgentMessage"> | number | null
    sources?: JsonNullableFilter<"AgentMessage">
    metadata?: JsonNullableFilter<"AgentMessage">
    session?: XOR<AgentSessionScalarRelationFilter, AgentSessionWhereInput>
  }

  export type AgentMessageOrderByWithRelationInput = {
    id?: SortOrder
    sessionId?: SortOrder
    agentType?: SortOrder
    messageContent?: SortOrder
    messageOrder?: SortOrder
    timestamp?: SortOrder
    confidence?: SortOrderInput | SortOrder
    sources?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    session?: AgentSessionOrderByWithRelationInput
  }

  export type AgentMessageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AgentMessageWhereInput | AgentMessageWhereInput[]
    OR?: AgentMessageWhereInput[]
    NOT?: AgentMessageWhereInput | AgentMessageWhereInput[]
    sessionId?: UuidFilter<"AgentMessage"> | string
    agentType?: EnumAgentTypeFilter<"AgentMessage"> | $Enums.AgentType
    messageContent?: StringFilter<"AgentMessage"> | string
    messageOrder?: IntFilter<"AgentMessage"> | number
    timestamp?: DateTimeFilter<"AgentMessage"> | Date | string
    confidence?: FloatNullableFilter<"AgentMessage"> | number | null
    sources?: JsonNullableFilter<"AgentMessage">
    metadata?: JsonNullableFilter<"AgentMessage">
    session?: XOR<AgentSessionScalarRelationFilter, AgentSessionWhereInput>
  }, "id">

  export type AgentMessageOrderByWithAggregationInput = {
    id?: SortOrder
    sessionId?: SortOrder
    agentType?: SortOrder
    messageContent?: SortOrder
    messageOrder?: SortOrder
    timestamp?: SortOrder
    confidence?: SortOrderInput | SortOrder
    sources?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    _count?: AgentMessageCountOrderByAggregateInput
    _avg?: AgentMessageAvgOrderByAggregateInput
    _max?: AgentMessageMaxOrderByAggregateInput
    _min?: AgentMessageMinOrderByAggregateInput
    _sum?: AgentMessageSumOrderByAggregateInput
  }

  export type AgentMessageScalarWhereWithAggregatesInput = {
    AND?: AgentMessageScalarWhereWithAggregatesInput | AgentMessageScalarWhereWithAggregatesInput[]
    OR?: AgentMessageScalarWhereWithAggregatesInput[]
    NOT?: AgentMessageScalarWhereWithAggregatesInput | AgentMessageScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AgentMessage"> | string
    sessionId?: UuidWithAggregatesFilter<"AgentMessage"> | string
    agentType?: EnumAgentTypeWithAggregatesFilter<"AgentMessage"> | $Enums.AgentType
    messageContent?: StringWithAggregatesFilter<"AgentMessage"> | string
    messageOrder?: IntWithAggregatesFilter<"AgentMessage"> | number
    timestamp?: DateTimeWithAggregatesFilter<"AgentMessage"> | Date | string
    confidence?: FloatNullableWithAggregatesFilter<"AgentMessage"> | number | null
    sources?: JsonNullableWithAggregatesFilter<"AgentMessage">
    metadata?: JsonNullableWithAggregatesFilter<"AgentMessage">
  }

  export type ConversationExportWhereInput = {
    AND?: ConversationExportWhereInput | ConversationExportWhereInput[]
    OR?: ConversationExportWhereInput[]
    NOT?: ConversationExportWhereInput | ConversationExportWhereInput[]
    id?: UuidFilter<"ConversationExport"> | string
    sessionId?: UuidFilter<"ConversationExport"> | string
    userId?: UuidNullableFilter<"ConversationExport"> | string | null
    exportFormat?: EnumExportFormatFilter<"ConversationExport"> | $Enums.ExportFormat
    exportedAt?: DateTimeFilter<"ConversationExport"> | Date | string
    filePath?: StringNullableFilter<"ConversationExport"> | string | null
    downloadUrl?: StringNullableFilter<"ConversationExport"> | string | null
    expiresAt?: DateTimeNullableFilter<"ConversationExport"> | Date | string | null
    session?: XOR<AgentSessionScalarRelationFilter, AgentSessionWhereInput>
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type ConversationExportOrderByWithRelationInput = {
    id?: SortOrder
    sessionId?: SortOrder
    userId?: SortOrderInput | SortOrder
    exportFormat?: SortOrder
    exportedAt?: SortOrder
    filePath?: SortOrderInput | SortOrder
    downloadUrl?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    session?: AgentSessionOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type ConversationExportWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ConversationExportWhereInput | ConversationExportWhereInput[]
    OR?: ConversationExportWhereInput[]
    NOT?: ConversationExportWhereInput | ConversationExportWhereInput[]
    sessionId?: UuidFilter<"ConversationExport"> | string
    userId?: UuidNullableFilter<"ConversationExport"> | string | null
    exportFormat?: EnumExportFormatFilter<"ConversationExport"> | $Enums.ExportFormat
    exportedAt?: DateTimeFilter<"ConversationExport"> | Date | string
    filePath?: StringNullableFilter<"ConversationExport"> | string | null
    downloadUrl?: StringNullableFilter<"ConversationExport"> | string | null
    expiresAt?: DateTimeNullableFilter<"ConversationExport"> | Date | string | null
    session?: XOR<AgentSessionScalarRelationFilter, AgentSessionWhereInput>
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type ConversationExportOrderByWithAggregationInput = {
    id?: SortOrder
    sessionId?: SortOrder
    userId?: SortOrderInput | SortOrder
    exportFormat?: SortOrder
    exportedAt?: SortOrder
    filePath?: SortOrderInput | SortOrder
    downloadUrl?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    _count?: ConversationExportCountOrderByAggregateInput
    _max?: ConversationExportMaxOrderByAggregateInput
    _min?: ConversationExportMinOrderByAggregateInput
  }

  export type ConversationExportScalarWhereWithAggregatesInput = {
    AND?: ConversationExportScalarWhereWithAggregatesInput | ConversationExportScalarWhereWithAggregatesInput[]
    OR?: ConversationExportScalarWhereWithAggregatesInput[]
    NOT?: ConversationExportScalarWhereWithAggregatesInput | ConversationExportScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ConversationExport"> | string
    sessionId?: UuidWithAggregatesFilter<"ConversationExport"> | string
    userId?: UuidNullableWithAggregatesFilter<"ConversationExport"> | string | null
    exportFormat?: EnumExportFormatWithAggregatesFilter<"ConversationExport"> | $Enums.ExportFormat
    exportedAt?: DateTimeWithAggregatesFilter<"ConversationExport"> | Date | string
    filePath?: StringNullableWithAggregatesFilter<"ConversationExport"> | string | null
    downloadUrl?: StringNullableWithAggregatesFilter<"ConversationExport"> | string | null
    expiresAt?: DateTimeNullableWithAggregatesFilter<"ConversationExport"> | Date | string | null
  }

  export type SignalCacheWhereInput = {
    AND?: SignalCacheWhereInput | SignalCacheWhereInput[]
    OR?: SignalCacheWhereInput[]
    NOT?: SignalCacheWhereInput | SignalCacheWhereInput[]
    id?: UuidFilter<"SignalCache"> | string
    signalType?: StringFilter<"SignalCache"> | string
    signalValue?: FloatFilter<"SignalCache"> | number
    confidence?: FloatFilter<"SignalCache"> | number
    timestamp?: DateTimeFilter<"SignalCache"> | Date | string
    expiresAt?: DateTimeFilter<"SignalCache"> | Date | string
    metadata?: JsonNullableFilter<"SignalCache">
    source?: StringNullableFilter<"SignalCache"> | string | null
  }

  export type SignalCacheOrderByWithRelationInput = {
    id?: SortOrder
    signalType?: SortOrder
    signalValue?: SortOrder
    confidence?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
    metadata?: SortOrderInput | SortOrder
    source?: SortOrderInput | SortOrder
  }

  export type SignalCacheWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SignalCacheWhereInput | SignalCacheWhereInput[]
    OR?: SignalCacheWhereInput[]
    NOT?: SignalCacheWhereInput | SignalCacheWhereInput[]
    signalType?: StringFilter<"SignalCache"> | string
    signalValue?: FloatFilter<"SignalCache"> | number
    confidence?: FloatFilter<"SignalCache"> | number
    timestamp?: DateTimeFilter<"SignalCache"> | Date | string
    expiresAt?: DateTimeFilter<"SignalCache"> | Date | string
    metadata?: JsonNullableFilter<"SignalCache">
    source?: StringNullableFilter<"SignalCache"> | string | null
  }, "id">

  export type SignalCacheOrderByWithAggregationInput = {
    id?: SortOrder
    signalType?: SortOrder
    signalValue?: SortOrder
    confidence?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
    metadata?: SortOrderInput | SortOrder
    source?: SortOrderInput | SortOrder
    _count?: SignalCacheCountOrderByAggregateInput
    _avg?: SignalCacheAvgOrderByAggregateInput
    _max?: SignalCacheMaxOrderByAggregateInput
    _min?: SignalCacheMinOrderByAggregateInput
    _sum?: SignalCacheSumOrderByAggregateInput
  }

  export type SignalCacheScalarWhereWithAggregatesInput = {
    AND?: SignalCacheScalarWhereWithAggregatesInput | SignalCacheScalarWhereWithAggregatesInput[]
    OR?: SignalCacheScalarWhereWithAggregatesInput[]
    NOT?: SignalCacheScalarWhereWithAggregatesInput | SignalCacheScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"SignalCache"> | string
    signalType?: StringWithAggregatesFilter<"SignalCache"> | string
    signalValue?: FloatWithAggregatesFilter<"SignalCache"> | number
    confidence?: FloatWithAggregatesFilter<"SignalCache"> | number
    timestamp?: DateTimeWithAggregatesFilter<"SignalCache"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"SignalCache"> | Date | string
    metadata?: JsonNullableWithAggregatesFilter<"SignalCache">
    source?: StringNullableWithAggregatesFilter<"SignalCache"> | string | null
  }

  export type UserSubscriptionWhereInput = {
    AND?: UserSubscriptionWhereInput | UserSubscriptionWhereInput[]
    OR?: UserSubscriptionWhereInput[]
    NOT?: UserSubscriptionWhereInput | UserSubscriptionWhereInput[]
    id?: UuidFilter<"UserSubscription"> | string
    userId?: UuidFilter<"UserSubscription"> | string
    subscriptionType?: StringFilter<"UserSubscription"> | string
    status?: StringFilter<"UserSubscription"> | string
    startDate?: DateTimeFilter<"UserSubscription"> | Date | string
    endDate?: DateTimeNullableFilter<"UserSubscription"> | Date | string | null
    metadata?: JsonNullableFilter<"UserSubscription">
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type UserSubscriptionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    subscriptionType?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type UserSubscriptionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: UserSubscriptionWhereInput | UserSubscriptionWhereInput[]
    OR?: UserSubscriptionWhereInput[]
    NOT?: UserSubscriptionWhereInput | UserSubscriptionWhereInput[]
    userId?: UuidFilter<"UserSubscription"> | string
    subscriptionType?: StringFilter<"UserSubscription"> | string
    status?: StringFilter<"UserSubscription"> | string
    startDate?: DateTimeFilter<"UserSubscription"> | Date | string
    endDate?: DateTimeNullableFilter<"UserSubscription"> | Date | string | null
    metadata?: JsonNullableFilter<"UserSubscription">
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type UserSubscriptionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    subscriptionType?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    _count?: UserSubscriptionCountOrderByAggregateInput
    _max?: UserSubscriptionMaxOrderByAggregateInput
    _min?: UserSubscriptionMinOrderByAggregateInput
  }

  export type UserSubscriptionScalarWhereWithAggregatesInput = {
    AND?: UserSubscriptionScalarWhereWithAggregatesInput | UserSubscriptionScalarWhereWithAggregatesInput[]
    OR?: UserSubscriptionScalarWhereWithAggregatesInput[]
    NOT?: UserSubscriptionScalarWhereWithAggregatesInput | UserSubscriptionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"UserSubscription"> | string
    userId?: UuidWithAggregatesFilter<"UserSubscription"> | string
    subscriptionType?: StringWithAggregatesFilter<"UserSubscription"> | string
    status?: StringWithAggregatesFilter<"UserSubscription"> | string
    startDate?: DateTimeWithAggregatesFilter<"UserSubscription"> | Date | string
    endDate?: DateTimeNullableWithAggregatesFilter<"UserSubscription"> | Date | string | null
    metadata?: JsonNullableWithAggregatesFilter<"UserSubscription">
  }

  export type UserCreateInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    agentSessions?: AgentSessionCreateNestedManyWithoutUserInput
    conversationExports?: ConversationExportCreateNestedManyWithoutUserInput
    userSubscriptions?: UserSubscriptionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    agentSessions?: AgentSessionUncheckedCreateNestedManyWithoutUserInput
    conversationExports?: ConversationExportUncheckedCreateNestedManyWithoutUserInput
    userSubscriptions?: UserSubscriptionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    agentSessions?: AgentSessionUpdateManyWithoutUserNestedInput
    conversationExports?: ConversationExportUpdateManyWithoutUserNestedInput
    userSubscriptions?: UserSubscriptionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    agentSessions?: AgentSessionUncheckedUpdateManyWithoutUserNestedInput
    conversationExports?: ConversationExportUncheckedUpdateManyWithoutUserNestedInput
    userSubscriptions?: UserSubscriptionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AgentSessionCreateInput = {
    id?: string
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserCreateNestedOneWithoutAgentSessionsInput
    messages?: AgentMessageCreateNestedManyWithoutSessionInput
    exports?: ConversationExportCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionUncheckedCreateInput = {
    id?: string
    userId?: string | null
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUncheckedCreateNestedManyWithoutSessionInput
    exports?: ConversationExportUncheckedCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserUpdateOneWithoutAgentSessionsNestedInput
    messages?: AgentMessageUpdateManyWithoutSessionNestedInput
    exports?: ConversationExportUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUncheckedUpdateManyWithoutSessionNestedInput
    exports?: ConversationExportUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionCreateManyInput = {
    id?: string
    userId?: string | null
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageCreateInput = {
    id?: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp?: Date | string
    confidence?: number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
    session: AgentSessionCreateNestedOneWithoutMessagesInput
  }

  export type AgentMessageUncheckedCreateInput = {
    id?: string
    sessionId: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp?: Date | string
    confidence?: number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
    session?: AgentSessionUpdateOneRequiredWithoutMessagesNestedInput
  }

  export type AgentMessageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageCreateManyInput = {
    id?: string
    sessionId: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp?: Date | string
    confidence?: number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ConversationExportCreateInput = {
    id?: string
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
    session: AgentSessionCreateNestedOneWithoutExportsInput
    user?: UserCreateNestedOneWithoutConversationExportsInput
  }

  export type ConversationExportUncheckedCreateInput = {
    id?: string
    sessionId: string
    userId?: string | null
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
  }

  export type ConversationExportUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    session?: AgentSessionUpdateOneRequiredWithoutExportsNestedInput
    user?: UserUpdateOneWithoutConversationExportsNestedInput
  }

  export type ConversationExportUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ConversationExportCreateManyInput = {
    id?: string
    sessionId: string
    userId?: string | null
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
  }

  export type ConversationExportUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ConversationExportUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type SignalCacheCreateInput = {
    id?: string
    signalType: string
    signalValue: number
    confidence?: number
    timestamp?: Date | string
    expiresAt: Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: string | null
  }

  export type SignalCacheUncheckedCreateInput = {
    id?: string
    signalType: string
    signalValue: number
    confidence?: number
    timestamp?: Date | string
    expiresAt: Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: string | null
  }

  export type SignalCacheUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    signalValue?: FloatFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SignalCacheUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    signalValue?: FloatFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SignalCacheCreateManyInput = {
    id?: string
    signalType: string
    signalValue: number
    confidence?: number
    timestamp?: Date | string
    expiresAt: Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: string | null
  }

  export type SignalCacheUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    signalValue?: FloatFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SignalCacheUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    signalType?: StringFieldUpdateOperationsInput | string
    signalValue?: FloatFieldUpdateOperationsInput | number
    confidence?: FloatFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    source?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserSubscriptionCreateInput = {
    id?: string
    subscriptionType: string
    status?: string
    startDate?: Date | string
    endDate?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user: UserCreateNestedOneWithoutUserSubscriptionsInput
  }

  export type UserSubscriptionUncheckedCreateInput = {
    id?: string
    userId: string
    subscriptionType: string
    status?: string
    startDate?: Date | string
    endDate?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserUpdateOneRequiredWithoutUserSubscriptionsNestedInput
  }

  export type UserSubscriptionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionCreateManyInput = {
    id?: string
    userId: string
    subscriptionType: string
    status?: string
    startDate?: Date | string
    endDate?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type AgentSessionListRelationFilter = {
    every?: AgentSessionWhereInput
    some?: AgentSessionWhereInput
    none?: AgentSessionWhereInput
  }

  export type ConversationExportListRelationFilter = {
    every?: ConversationExportWhereInput
    some?: ConversationExportWhereInput
    none?: ConversationExportWhereInput
  }

  export type UserSubscriptionListRelationFilter = {
    every?: UserSubscriptionWhereInput
    some?: UserSubscriptionWhereInput
    none?: UserSubscriptionWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AgentSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConversationExportOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserSubscriptionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    imageUrl?: SortOrder
    isActive?: SortOrder
    preferences?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastLoginAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    imageUrl?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastLoginAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    imageUrl?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastLoginAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type EnumContentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentType | EnumContentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumContentTypeFilter<$PrismaModel> | $Enums.ContentType
  }

  export type EnumSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusFilter<$PrismaModel> | $Enums.SessionStatus
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type AgentMessageListRelationFilter = {
    every?: AgentMessageWhereInput
    some?: AgentMessageWhereInput
    none?: AgentMessageWhereInput
  }

  export type AgentMessageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AgentSessionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    sessionTitle?: SortOrder
    contentType?: SortOrder
    contentSource?: SortOrder
    contentUrl?: SortOrder
    contentText?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    metadata?: SortOrder
  }

  export type AgentSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    sessionTitle?: SortOrder
    contentType?: SortOrder
    contentSource?: SortOrder
    contentUrl?: SortOrder
    contentText?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type AgentSessionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    sessionTitle?: SortOrder
    contentType?: SortOrder
    contentSource?: SortOrder
    contentUrl?: SortOrder
    contentText?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumContentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentType | EnumContentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumContentTypeWithAggregatesFilter<$PrismaModel> | $Enums.ContentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumContentTypeFilter<$PrismaModel>
    _max?: NestedEnumContentTypeFilter<$PrismaModel>
  }

  export type EnumSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumSessionStatusFilter<$PrismaModel>
  }

  export type EnumAgentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AgentType | EnumAgentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAgentTypeFilter<$PrismaModel> | $Enums.AgentType
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type AgentSessionScalarRelationFilter = {
    is?: AgentSessionWhereInput
    isNot?: AgentSessionWhereInput
  }

  export type AgentMessageCountOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    agentType?: SortOrder
    messageContent?: SortOrder
    messageOrder?: SortOrder
    timestamp?: SortOrder
    confidence?: SortOrder
    sources?: SortOrder
    metadata?: SortOrder
  }

  export type AgentMessageAvgOrderByAggregateInput = {
    messageOrder?: SortOrder
    confidence?: SortOrder
  }

  export type AgentMessageMaxOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    agentType?: SortOrder
    messageContent?: SortOrder
    messageOrder?: SortOrder
    timestamp?: SortOrder
    confidence?: SortOrder
  }

  export type AgentMessageMinOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    agentType?: SortOrder
    messageContent?: SortOrder
    messageOrder?: SortOrder
    timestamp?: SortOrder
    confidence?: SortOrder
  }

  export type AgentMessageSumOrderByAggregateInput = {
    messageOrder?: SortOrder
    confidence?: SortOrder
  }

  export type EnumAgentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AgentType | EnumAgentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAgentTypeWithAggregatesFilter<$PrismaModel> | $Enums.AgentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAgentTypeFilter<$PrismaModel>
    _max?: NestedEnumAgentTypeFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type EnumExportFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.ExportFormat | EnumExportFormatFieldRefInput<$PrismaModel>
    in?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumExportFormatFilter<$PrismaModel> | $Enums.ExportFormat
  }

  export type ConversationExportCountOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    userId?: SortOrder
    exportFormat?: SortOrder
    exportedAt?: SortOrder
    filePath?: SortOrder
    downloadUrl?: SortOrder
    expiresAt?: SortOrder
  }

  export type ConversationExportMaxOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    userId?: SortOrder
    exportFormat?: SortOrder
    exportedAt?: SortOrder
    filePath?: SortOrder
    downloadUrl?: SortOrder
    expiresAt?: SortOrder
  }

  export type ConversationExportMinOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    userId?: SortOrder
    exportFormat?: SortOrder
    exportedAt?: SortOrder
    filePath?: SortOrder
    downloadUrl?: SortOrder
    expiresAt?: SortOrder
  }

  export type EnumExportFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ExportFormat | EnumExportFormatFieldRefInput<$PrismaModel>
    in?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumExportFormatWithAggregatesFilter<$PrismaModel> | $Enums.ExportFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumExportFormatFilter<$PrismaModel>
    _max?: NestedEnumExportFormatFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type SignalCacheCountOrderByAggregateInput = {
    id?: SortOrder
    signalType?: SortOrder
    signalValue?: SortOrder
    confidence?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
    metadata?: SortOrder
    source?: SortOrder
  }

  export type SignalCacheAvgOrderByAggregateInput = {
    signalValue?: SortOrder
    confidence?: SortOrder
  }

  export type SignalCacheMaxOrderByAggregateInput = {
    id?: SortOrder
    signalType?: SortOrder
    signalValue?: SortOrder
    confidence?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
    source?: SortOrder
  }

  export type SignalCacheMinOrderByAggregateInput = {
    id?: SortOrder
    signalType?: SortOrder
    signalValue?: SortOrder
    confidence?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
    source?: SortOrder
  }

  export type SignalCacheSumOrderByAggregateInput = {
    signalValue?: SortOrder
    confidence?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type UserSubscriptionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    subscriptionType?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    metadata?: SortOrder
  }

  export type UserSubscriptionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    subscriptionType?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
  }

  export type UserSubscriptionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    subscriptionType?: SortOrder
    status?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
  }

  export type AgentSessionCreateNestedManyWithoutUserInput = {
    create?: XOR<AgentSessionCreateWithoutUserInput, AgentSessionUncheckedCreateWithoutUserInput> | AgentSessionCreateWithoutUserInput[] | AgentSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AgentSessionCreateOrConnectWithoutUserInput | AgentSessionCreateOrConnectWithoutUserInput[]
    createMany?: AgentSessionCreateManyUserInputEnvelope
    connect?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
  }

  export type ConversationExportCreateNestedManyWithoutUserInput = {
    create?: XOR<ConversationExportCreateWithoutUserInput, ConversationExportUncheckedCreateWithoutUserInput> | ConversationExportCreateWithoutUserInput[] | ConversationExportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutUserInput | ConversationExportCreateOrConnectWithoutUserInput[]
    createMany?: ConversationExportCreateManyUserInputEnvelope
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
  }

  export type UserSubscriptionCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSubscriptionCreateWithoutUserInput, UserSubscriptionUncheckedCreateWithoutUserInput> | UserSubscriptionCreateWithoutUserInput[] | UserSubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSubscriptionCreateOrConnectWithoutUserInput | UserSubscriptionCreateOrConnectWithoutUserInput[]
    createMany?: UserSubscriptionCreateManyUserInputEnvelope
    connect?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
  }

  export type AgentSessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AgentSessionCreateWithoutUserInput, AgentSessionUncheckedCreateWithoutUserInput> | AgentSessionCreateWithoutUserInput[] | AgentSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AgentSessionCreateOrConnectWithoutUserInput | AgentSessionCreateOrConnectWithoutUserInput[]
    createMany?: AgentSessionCreateManyUserInputEnvelope
    connect?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
  }

  export type ConversationExportUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ConversationExportCreateWithoutUserInput, ConversationExportUncheckedCreateWithoutUserInput> | ConversationExportCreateWithoutUserInput[] | ConversationExportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutUserInput | ConversationExportCreateOrConnectWithoutUserInput[]
    createMany?: ConversationExportCreateManyUserInputEnvelope
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
  }

  export type UserSubscriptionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserSubscriptionCreateWithoutUserInput, UserSubscriptionUncheckedCreateWithoutUserInput> | UserSubscriptionCreateWithoutUserInput[] | UserSubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSubscriptionCreateOrConnectWithoutUserInput | UserSubscriptionCreateOrConnectWithoutUserInput[]
    createMany?: UserSubscriptionCreateManyUserInputEnvelope
    connect?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type AgentSessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<AgentSessionCreateWithoutUserInput, AgentSessionUncheckedCreateWithoutUserInput> | AgentSessionCreateWithoutUserInput[] | AgentSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AgentSessionCreateOrConnectWithoutUserInput | AgentSessionCreateOrConnectWithoutUserInput[]
    upsert?: AgentSessionUpsertWithWhereUniqueWithoutUserInput | AgentSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AgentSessionCreateManyUserInputEnvelope
    set?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    disconnect?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    delete?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    connect?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    update?: AgentSessionUpdateWithWhereUniqueWithoutUserInput | AgentSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AgentSessionUpdateManyWithWhereWithoutUserInput | AgentSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AgentSessionScalarWhereInput | AgentSessionScalarWhereInput[]
  }

  export type ConversationExportUpdateManyWithoutUserNestedInput = {
    create?: XOR<ConversationExportCreateWithoutUserInput, ConversationExportUncheckedCreateWithoutUserInput> | ConversationExportCreateWithoutUserInput[] | ConversationExportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutUserInput | ConversationExportCreateOrConnectWithoutUserInput[]
    upsert?: ConversationExportUpsertWithWhereUniqueWithoutUserInput | ConversationExportUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ConversationExportCreateManyUserInputEnvelope
    set?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    disconnect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    delete?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    update?: ConversationExportUpdateWithWhereUniqueWithoutUserInput | ConversationExportUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ConversationExportUpdateManyWithWhereWithoutUserInput | ConversationExportUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ConversationExportScalarWhereInput | ConversationExportScalarWhereInput[]
  }

  export type UserSubscriptionUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSubscriptionCreateWithoutUserInput, UserSubscriptionUncheckedCreateWithoutUserInput> | UserSubscriptionCreateWithoutUserInput[] | UserSubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSubscriptionCreateOrConnectWithoutUserInput | UserSubscriptionCreateOrConnectWithoutUserInput[]
    upsert?: UserSubscriptionUpsertWithWhereUniqueWithoutUserInput | UserSubscriptionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSubscriptionCreateManyUserInputEnvelope
    set?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    disconnect?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    delete?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    connect?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    update?: UserSubscriptionUpdateWithWhereUniqueWithoutUserInput | UserSubscriptionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSubscriptionUpdateManyWithWhereWithoutUserInput | UserSubscriptionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSubscriptionScalarWhereInput | UserSubscriptionScalarWhereInput[]
  }

  export type AgentSessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AgentSessionCreateWithoutUserInput, AgentSessionUncheckedCreateWithoutUserInput> | AgentSessionCreateWithoutUserInput[] | AgentSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AgentSessionCreateOrConnectWithoutUserInput | AgentSessionCreateOrConnectWithoutUserInput[]
    upsert?: AgentSessionUpsertWithWhereUniqueWithoutUserInput | AgentSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AgentSessionCreateManyUserInputEnvelope
    set?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    disconnect?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    delete?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    connect?: AgentSessionWhereUniqueInput | AgentSessionWhereUniqueInput[]
    update?: AgentSessionUpdateWithWhereUniqueWithoutUserInput | AgentSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AgentSessionUpdateManyWithWhereWithoutUserInput | AgentSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AgentSessionScalarWhereInput | AgentSessionScalarWhereInput[]
  }

  export type ConversationExportUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ConversationExportCreateWithoutUserInput, ConversationExportUncheckedCreateWithoutUserInput> | ConversationExportCreateWithoutUserInput[] | ConversationExportUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutUserInput | ConversationExportCreateOrConnectWithoutUserInput[]
    upsert?: ConversationExportUpsertWithWhereUniqueWithoutUserInput | ConversationExportUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ConversationExportCreateManyUserInputEnvelope
    set?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    disconnect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    delete?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    update?: ConversationExportUpdateWithWhereUniqueWithoutUserInput | ConversationExportUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ConversationExportUpdateManyWithWhereWithoutUserInput | ConversationExportUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ConversationExportScalarWhereInput | ConversationExportScalarWhereInput[]
  }

  export type UserSubscriptionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserSubscriptionCreateWithoutUserInput, UserSubscriptionUncheckedCreateWithoutUserInput> | UserSubscriptionCreateWithoutUserInput[] | UserSubscriptionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserSubscriptionCreateOrConnectWithoutUserInput | UserSubscriptionCreateOrConnectWithoutUserInput[]
    upsert?: UserSubscriptionUpsertWithWhereUniqueWithoutUserInput | UserSubscriptionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserSubscriptionCreateManyUserInputEnvelope
    set?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    disconnect?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    delete?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    connect?: UserSubscriptionWhereUniqueInput | UserSubscriptionWhereUniqueInput[]
    update?: UserSubscriptionUpdateWithWhereUniqueWithoutUserInput | UserSubscriptionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserSubscriptionUpdateManyWithWhereWithoutUserInput | UserSubscriptionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserSubscriptionScalarWhereInput | UserSubscriptionScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutAgentSessionsInput = {
    create?: XOR<UserCreateWithoutAgentSessionsInput, UserUncheckedCreateWithoutAgentSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAgentSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type AgentMessageCreateNestedManyWithoutSessionInput = {
    create?: XOR<AgentMessageCreateWithoutSessionInput, AgentMessageUncheckedCreateWithoutSessionInput> | AgentMessageCreateWithoutSessionInput[] | AgentMessageUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: AgentMessageCreateOrConnectWithoutSessionInput | AgentMessageCreateOrConnectWithoutSessionInput[]
    createMany?: AgentMessageCreateManySessionInputEnvelope
    connect?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
  }

  export type ConversationExportCreateNestedManyWithoutSessionInput = {
    create?: XOR<ConversationExportCreateWithoutSessionInput, ConversationExportUncheckedCreateWithoutSessionInput> | ConversationExportCreateWithoutSessionInput[] | ConversationExportUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutSessionInput | ConversationExportCreateOrConnectWithoutSessionInput[]
    createMany?: ConversationExportCreateManySessionInputEnvelope
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
  }

  export type AgentMessageUncheckedCreateNestedManyWithoutSessionInput = {
    create?: XOR<AgentMessageCreateWithoutSessionInput, AgentMessageUncheckedCreateWithoutSessionInput> | AgentMessageCreateWithoutSessionInput[] | AgentMessageUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: AgentMessageCreateOrConnectWithoutSessionInput | AgentMessageCreateOrConnectWithoutSessionInput[]
    createMany?: AgentMessageCreateManySessionInputEnvelope
    connect?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
  }

  export type ConversationExportUncheckedCreateNestedManyWithoutSessionInput = {
    create?: XOR<ConversationExportCreateWithoutSessionInput, ConversationExportUncheckedCreateWithoutSessionInput> | ConversationExportCreateWithoutSessionInput[] | ConversationExportUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutSessionInput | ConversationExportCreateOrConnectWithoutSessionInput[]
    createMany?: ConversationExportCreateManySessionInputEnvelope
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
  }

  export type EnumContentTypeFieldUpdateOperationsInput = {
    set?: $Enums.ContentType
  }

  export type EnumSessionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SessionStatus
  }

  export type UserUpdateOneWithoutAgentSessionsNestedInput = {
    create?: XOR<UserCreateWithoutAgentSessionsInput, UserUncheckedCreateWithoutAgentSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAgentSessionsInput
    upsert?: UserUpsertWithoutAgentSessionsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAgentSessionsInput, UserUpdateWithoutAgentSessionsInput>, UserUncheckedUpdateWithoutAgentSessionsInput>
  }

  export type AgentMessageUpdateManyWithoutSessionNestedInput = {
    create?: XOR<AgentMessageCreateWithoutSessionInput, AgentMessageUncheckedCreateWithoutSessionInput> | AgentMessageCreateWithoutSessionInput[] | AgentMessageUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: AgentMessageCreateOrConnectWithoutSessionInput | AgentMessageCreateOrConnectWithoutSessionInput[]
    upsert?: AgentMessageUpsertWithWhereUniqueWithoutSessionInput | AgentMessageUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: AgentMessageCreateManySessionInputEnvelope
    set?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    disconnect?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    delete?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    connect?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    update?: AgentMessageUpdateWithWhereUniqueWithoutSessionInput | AgentMessageUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: AgentMessageUpdateManyWithWhereWithoutSessionInput | AgentMessageUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: AgentMessageScalarWhereInput | AgentMessageScalarWhereInput[]
  }

  export type ConversationExportUpdateManyWithoutSessionNestedInput = {
    create?: XOR<ConversationExportCreateWithoutSessionInput, ConversationExportUncheckedCreateWithoutSessionInput> | ConversationExportCreateWithoutSessionInput[] | ConversationExportUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutSessionInput | ConversationExportCreateOrConnectWithoutSessionInput[]
    upsert?: ConversationExportUpsertWithWhereUniqueWithoutSessionInput | ConversationExportUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: ConversationExportCreateManySessionInputEnvelope
    set?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    disconnect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    delete?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    update?: ConversationExportUpdateWithWhereUniqueWithoutSessionInput | ConversationExportUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: ConversationExportUpdateManyWithWhereWithoutSessionInput | ConversationExportUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: ConversationExportScalarWhereInput | ConversationExportScalarWhereInput[]
  }

  export type AgentMessageUncheckedUpdateManyWithoutSessionNestedInput = {
    create?: XOR<AgentMessageCreateWithoutSessionInput, AgentMessageUncheckedCreateWithoutSessionInput> | AgentMessageCreateWithoutSessionInput[] | AgentMessageUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: AgentMessageCreateOrConnectWithoutSessionInput | AgentMessageCreateOrConnectWithoutSessionInput[]
    upsert?: AgentMessageUpsertWithWhereUniqueWithoutSessionInput | AgentMessageUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: AgentMessageCreateManySessionInputEnvelope
    set?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    disconnect?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    delete?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    connect?: AgentMessageWhereUniqueInput | AgentMessageWhereUniqueInput[]
    update?: AgentMessageUpdateWithWhereUniqueWithoutSessionInput | AgentMessageUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: AgentMessageUpdateManyWithWhereWithoutSessionInput | AgentMessageUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: AgentMessageScalarWhereInput | AgentMessageScalarWhereInput[]
  }

  export type ConversationExportUncheckedUpdateManyWithoutSessionNestedInput = {
    create?: XOR<ConversationExportCreateWithoutSessionInput, ConversationExportUncheckedCreateWithoutSessionInput> | ConversationExportCreateWithoutSessionInput[] | ConversationExportUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: ConversationExportCreateOrConnectWithoutSessionInput | ConversationExportCreateOrConnectWithoutSessionInput[]
    upsert?: ConversationExportUpsertWithWhereUniqueWithoutSessionInput | ConversationExportUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: ConversationExportCreateManySessionInputEnvelope
    set?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    disconnect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    delete?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    connect?: ConversationExportWhereUniqueInput | ConversationExportWhereUniqueInput[]
    update?: ConversationExportUpdateWithWhereUniqueWithoutSessionInput | ConversationExportUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: ConversationExportUpdateManyWithWhereWithoutSessionInput | ConversationExportUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: ConversationExportScalarWhereInput | ConversationExportScalarWhereInput[]
  }

  export type AgentSessionCreateNestedOneWithoutMessagesInput = {
    create?: XOR<AgentSessionCreateWithoutMessagesInput, AgentSessionUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: AgentSessionCreateOrConnectWithoutMessagesInput
    connect?: AgentSessionWhereUniqueInput
  }

  export type EnumAgentTypeFieldUpdateOperationsInput = {
    set?: $Enums.AgentType
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type AgentSessionUpdateOneRequiredWithoutMessagesNestedInput = {
    create?: XOR<AgentSessionCreateWithoutMessagesInput, AgentSessionUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: AgentSessionCreateOrConnectWithoutMessagesInput
    upsert?: AgentSessionUpsertWithoutMessagesInput
    connect?: AgentSessionWhereUniqueInput
    update?: XOR<XOR<AgentSessionUpdateToOneWithWhereWithoutMessagesInput, AgentSessionUpdateWithoutMessagesInput>, AgentSessionUncheckedUpdateWithoutMessagesInput>
  }

  export type AgentSessionCreateNestedOneWithoutExportsInput = {
    create?: XOR<AgentSessionCreateWithoutExportsInput, AgentSessionUncheckedCreateWithoutExportsInput>
    connectOrCreate?: AgentSessionCreateOrConnectWithoutExportsInput
    connect?: AgentSessionWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutConversationExportsInput = {
    create?: XOR<UserCreateWithoutConversationExportsInput, UserUncheckedCreateWithoutConversationExportsInput>
    connectOrCreate?: UserCreateOrConnectWithoutConversationExportsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumExportFormatFieldUpdateOperationsInput = {
    set?: $Enums.ExportFormat
  }

  export type AgentSessionUpdateOneRequiredWithoutExportsNestedInput = {
    create?: XOR<AgentSessionCreateWithoutExportsInput, AgentSessionUncheckedCreateWithoutExportsInput>
    connectOrCreate?: AgentSessionCreateOrConnectWithoutExportsInput
    upsert?: AgentSessionUpsertWithoutExportsInput
    connect?: AgentSessionWhereUniqueInput
    update?: XOR<XOR<AgentSessionUpdateToOneWithWhereWithoutExportsInput, AgentSessionUpdateWithoutExportsInput>, AgentSessionUncheckedUpdateWithoutExportsInput>
  }

  export type UserUpdateOneWithoutConversationExportsNestedInput = {
    create?: XOR<UserCreateWithoutConversationExportsInput, UserUncheckedCreateWithoutConversationExportsInput>
    connectOrCreate?: UserCreateOrConnectWithoutConversationExportsInput
    upsert?: UserUpsertWithoutConversationExportsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutConversationExportsInput, UserUpdateWithoutConversationExportsInput>, UserUncheckedUpdateWithoutConversationExportsInput>
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserCreateNestedOneWithoutUserSubscriptionsInput = {
    create?: XOR<UserCreateWithoutUserSubscriptionsInput, UserUncheckedCreateWithoutUserSubscriptionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUserSubscriptionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutUserSubscriptionsNestedInput = {
    create?: XOR<UserCreateWithoutUserSubscriptionsInput, UserUncheckedCreateWithoutUserSubscriptionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUserSubscriptionsInput
    upsert?: UserUpsertWithoutUserSubscriptionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUserSubscriptionsInput, UserUpdateWithoutUserSubscriptionsInput>, UserUncheckedUpdateWithoutUserSubscriptionsInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumContentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentType | EnumContentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumContentTypeFilter<$PrismaModel> | $Enums.ContentType
  }

  export type NestedEnumSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusFilter<$PrismaModel> | $Enums.SessionStatus
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumContentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentType | EnumContentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentType[] | ListEnumContentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumContentTypeWithAggregatesFilter<$PrismaModel> | $Enums.ContentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumContentTypeFilter<$PrismaModel>
    _max?: NestedEnumContentTypeFilter<$PrismaModel>
  }

  export type NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SessionStatus | EnumSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SessionStatus[] | ListEnumSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumSessionStatusFilter<$PrismaModel>
  }

  export type NestedEnumAgentTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AgentType | EnumAgentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAgentTypeFilter<$PrismaModel> | $Enums.AgentType
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumAgentTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AgentType | EnumAgentTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AgentType[] | ListEnumAgentTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAgentTypeWithAggregatesFilter<$PrismaModel> | $Enums.AgentType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAgentTypeFilter<$PrismaModel>
    _max?: NestedEnumAgentTypeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedEnumExportFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.ExportFormat | EnumExportFormatFieldRefInput<$PrismaModel>
    in?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumExportFormatFilter<$PrismaModel> | $Enums.ExportFormat
  }

  export type NestedEnumExportFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ExportFormat | EnumExportFormatFieldRefInput<$PrismaModel>
    in?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExportFormat[] | ListEnumExportFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumExportFormatWithAggregatesFilter<$PrismaModel> | $Enums.ExportFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumExportFormatFilter<$PrismaModel>
    _max?: NestedEnumExportFormatFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type AgentSessionCreateWithoutUserInput = {
    id?: string
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageCreateNestedManyWithoutSessionInput
    exports?: ConversationExportCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionUncheckedCreateWithoutUserInput = {
    id?: string
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUncheckedCreateNestedManyWithoutSessionInput
    exports?: ConversationExportUncheckedCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionCreateOrConnectWithoutUserInput = {
    where: AgentSessionWhereUniqueInput
    create: XOR<AgentSessionCreateWithoutUserInput, AgentSessionUncheckedCreateWithoutUserInput>
  }

  export type AgentSessionCreateManyUserInputEnvelope = {
    data: AgentSessionCreateManyUserInput | AgentSessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type ConversationExportCreateWithoutUserInput = {
    id?: string
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
    session: AgentSessionCreateNestedOneWithoutExportsInput
  }

  export type ConversationExportUncheckedCreateWithoutUserInput = {
    id?: string
    sessionId: string
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
  }

  export type ConversationExportCreateOrConnectWithoutUserInput = {
    where: ConversationExportWhereUniqueInput
    create: XOR<ConversationExportCreateWithoutUserInput, ConversationExportUncheckedCreateWithoutUserInput>
  }

  export type ConversationExportCreateManyUserInputEnvelope = {
    data: ConversationExportCreateManyUserInput | ConversationExportCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UserSubscriptionCreateWithoutUserInput = {
    id?: string
    subscriptionType: string
    status?: string
    startDate?: Date | string
    endDate?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionUncheckedCreateWithoutUserInput = {
    id?: string
    subscriptionType: string
    status?: string
    startDate?: Date | string
    endDate?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionCreateOrConnectWithoutUserInput = {
    where: UserSubscriptionWhereUniqueInput
    create: XOR<UserSubscriptionCreateWithoutUserInput, UserSubscriptionUncheckedCreateWithoutUserInput>
  }

  export type UserSubscriptionCreateManyUserInputEnvelope = {
    data: UserSubscriptionCreateManyUserInput | UserSubscriptionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AgentSessionUpsertWithWhereUniqueWithoutUserInput = {
    where: AgentSessionWhereUniqueInput
    update: XOR<AgentSessionUpdateWithoutUserInput, AgentSessionUncheckedUpdateWithoutUserInput>
    create: XOR<AgentSessionCreateWithoutUserInput, AgentSessionUncheckedCreateWithoutUserInput>
  }

  export type AgentSessionUpdateWithWhereUniqueWithoutUserInput = {
    where: AgentSessionWhereUniqueInput
    data: XOR<AgentSessionUpdateWithoutUserInput, AgentSessionUncheckedUpdateWithoutUserInput>
  }

  export type AgentSessionUpdateManyWithWhereWithoutUserInput = {
    where: AgentSessionScalarWhereInput
    data: XOR<AgentSessionUpdateManyMutationInput, AgentSessionUncheckedUpdateManyWithoutUserInput>
  }

  export type AgentSessionScalarWhereInput = {
    AND?: AgentSessionScalarWhereInput | AgentSessionScalarWhereInput[]
    OR?: AgentSessionScalarWhereInput[]
    NOT?: AgentSessionScalarWhereInput | AgentSessionScalarWhereInput[]
    id?: UuidFilter<"AgentSession"> | string
    userId?: UuidNullableFilter<"AgentSession"> | string | null
    sessionTitle?: StringFilter<"AgentSession"> | string
    contentType?: EnumContentTypeFilter<"AgentSession"> | $Enums.ContentType
    contentSource?: StringFilter<"AgentSession"> | string
    contentUrl?: StringNullableFilter<"AgentSession"> | string | null
    contentText?: StringFilter<"AgentSession"> | string
    status?: EnumSessionStatusFilter<"AgentSession"> | $Enums.SessionStatus
    startedAt?: DateTimeFilter<"AgentSession"> | Date | string
    completedAt?: DateTimeNullableFilter<"AgentSession"> | Date | string | null
    metadata?: JsonNullableFilter<"AgentSession">
  }

  export type ConversationExportUpsertWithWhereUniqueWithoutUserInput = {
    where: ConversationExportWhereUniqueInput
    update: XOR<ConversationExportUpdateWithoutUserInput, ConversationExportUncheckedUpdateWithoutUserInput>
    create: XOR<ConversationExportCreateWithoutUserInput, ConversationExportUncheckedCreateWithoutUserInput>
  }

  export type ConversationExportUpdateWithWhereUniqueWithoutUserInput = {
    where: ConversationExportWhereUniqueInput
    data: XOR<ConversationExportUpdateWithoutUserInput, ConversationExportUncheckedUpdateWithoutUserInput>
  }

  export type ConversationExportUpdateManyWithWhereWithoutUserInput = {
    where: ConversationExportScalarWhereInput
    data: XOR<ConversationExportUpdateManyMutationInput, ConversationExportUncheckedUpdateManyWithoutUserInput>
  }

  export type ConversationExportScalarWhereInput = {
    AND?: ConversationExportScalarWhereInput | ConversationExportScalarWhereInput[]
    OR?: ConversationExportScalarWhereInput[]
    NOT?: ConversationExportScalarWhereInput | ConversationExportScalarWhereInput[]
    id?: UuidFilter<"ConversationExport"> | string
    sessionId?: UuidFilter<"ConversationExport"> | string
    userId?: UuidNullableFilter<"ConversationExport"> | string | null
    exportFormat?: EnumExportFormatFilter<"ConversationExport"> | $Enums.ExportFormat
    exportedAt?: DateTimeFilter<"ConversationExport"> | Date | string
    filePath?: StringNullableFilter<"ConversationExport"> | string | null
    downloadUrl?: StringNullableFilter<"ConversationExport"> | string | null
    expiresAt?: DateTimeNullableFilter<"ConversationExport"> | Date | string | null
  }

  export type UserSubscriptionUpsertWithWhereUniqueWithoutUserInput = {
    where: UserSubscriptionWhereUniqueInput
    update: XOR<UserSubscriptionUpdateWithoutUserInput, UserSubscriptionUncheckedUpdateWithoutUserInput>
    create: XOR<UserSubscriptionCreateWithoutUserInput, UserSubscriptionUncheckedCreateWithoutUserInput>
  }

  export type UserSubscriptionUpdateWithWhereUniqueWithoutUserInput = {
    where: UserSubscriptionWhereUniqueInput
    data: XOR<UserSubscriptionUpdateWithoutUserInput, UserSubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type UserSubscriptionUpdateManyWithWhereWithoutUserInput = {
    where: UserSubscriptionScalarWhereInput
    data: XOR<UserSubscriptionUpdateManyMutationInput, UserSubscriptionUncheckedUpdateManyWithoutUserInput>
  }

  export type UserSubscriptionScalarWhereInput = {
    AND?: UserSubscriptionScalarWhereInput | UserSubscriptionScalarWhereInput[]
    OR?: UserSubscriptionScalarWhereInput[]
    NOT?: UserSubscriptionScalarWhereInput | UserSubscriptionScalarWhereInput[]
    id?: UuidFilter<"UserSubscription"> | string
    userId?: UuidFilter<"UserSubscription"> | string
    subscriptionType?: StringFilter<"UserSubscription"> | string
    status?: StringFilter<"UserSubscription"> | string
    startDate?: DateTimeFilter<"UserSubscription"> | Date | string
    endDate?: DateTimeNullableFilter<"UserSubscription"> | Date | string | null
    metadata?: JsonNullableFilter<"UserSubscription">
  }

  export type UserCreateWithoutAgentSessionsInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    conversationExports?: ConversationExportCreateNestedManyWithoutUserInput
    userSubscriptions?: UserSubscriptionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAgentSessionsInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    conversationExports?: ConversationExportUncheckedCreateNestedManyWithoutUserInput
    userSubscriptions?: UserSubscriptionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAgentSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAgentSessionsInput, UserUncheckedCreateWithoutAgentSessionsInput>
  }

  export type AgentMessageCreateWithoutSessionInput = {
    id?: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp?: Date | string
    confidence?: number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageUncheckedCreateWithoutSessionInput = {
    id?: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp?: Date | string
    confidence?: number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageCreateOrConnectWithoutSessionInput = {
    where: AgentMessageWhereUniqueInput
    create: XOR<AgentMessageCreateWithoutSessionInput, AgentMessageUncheckedCreateWithoutSessionInput>
  }

  export type AgentMessageCreateManySessionInputEnvelope = {
    data: AgentMessageCreateManySessionInput | AgentMessageCreateManySessionInput[]
    skipDuplicates?: boolean
  }

  export type ConversationExportCreateWithoutSessionInput = {
    id?: string
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
    user?: UserCreateNestedOneWithoutConversationExportsInput
  }

  export type ConversationExportUncheckedCreateWithoutSessionInput = {
    id?: string
    userId?: string | null
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
  }

  export type ConversationExportCreateOrConnectWithoutSessionInput = {
    where: ConversationExportWhereUniqueInput
    create: XOR<ConversationExportCreateWithoutSessionInput, ConversationExportUncheckedCreateWithoutSessionInput>
  }

  export type ConversationExportCreateManySessionInputEnvelope = {
    data: ConversationExportCreateManySessionInput | ConversationExportCreateManySessionInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutAgentSessionsInput = {
    update: XOR<UserUpdateWithoutAgentSessionsInput, UserUncheckedUpdateWithoutAgentSessionsInput>
    create: XOR<UserCreateWithoutAgentSessionsInput, UserUncheckedCreateWithoutAgentSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAgentSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAgentSessionsInput, UserUncheckedUpdateWithoutAgentSessionsInput>
  }

  export type UserUpdateWithoutAgentSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    conversationExports?: ConversationExportUpdateManyWithoutUserNestedInput
    userSubscriptions?: UserSubscriptionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAgentSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    conversationExports?: ConversationExportUncheckedUpdateManyWithoutUserNestedInput
    userSubscriptions?: UserSubscriptionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type AgentMessageUpsertWithWhereUniqueWithoutSessionInput = {
    where: AgentMessageWhereUniqueInput
    update: XOR<AgentMessageUpdateWithoutSessionInput, AgentMessageUncheckedUpdateWithoutSessionInput>
    create: XOR<AgentMessageCreateWithoutSessionInput, AgentMessageUncheckedCreateWithoutSessionInput>
  }

  export type AgentMessageUpdateWithWhereUniqueWithoutSessionInput = {
    where: AgentMessageWhereUniqueInput
    data: XOR<AgentMessageUpdateWithoutSessionInput, AgentMessageUncheckedUpdateWithoutSessionInput>
  }

  export type AgentMessageUpdateManyWithWhereWithoutSessionInput = {
    where: AgentMessageScalarWhereInput
    data: XOR<AgentMessageUpdateManyMutationInput, AgentMessageUncheckedUpdateManyWithoutSessionInput>
  }

  export type AgentMessageScalarWhereInput = {
    AND?: AgentMessageScalarWhereInput | AgentMessageScalarWhereInput[]
    OR?: AgentMessageScalarWhereInput[]
    NOT?: AgentMessageScalarWhereInput | AgentMessageScalarWhereInput[]
    id?: UuidFilter<"AgentMessage"> | string
    sessionId?: UuidFilter<"AgentMessage"> | string
    agentType?: EnumAgentTypeFilter<"AgentMessage"> | $Enums.AgentType
    messageContent?: StringFilter<"AgentMessage"> | string
    messageOrder?: IntFilter<"AgentMessage"> | number
    timestamp?: DateTimeFilter<"AgentMessage"> | Date | string
    confidence?: FloatNullableFilter<"AgentMessage"> | number | null
    sources?: JsonNullableFilter<"AgentMessage">
    metadata?: JsonNullableFilter<"AgentMessage">
  }

  export type ConversationExportUpsertWithWhereUniqueWithoutSessionInput = {
    where: ConversationExportWhereUniqueInput
    update: XOR<ConversationExportUpdateWithoutSessionInput, ConversationExportUncheckedUpdateWithoutSessionInput>
    create: XOR<ConversationExportCreateWithoutSessionInput, ConversationExportUncheckedCreateWithoutSessionInput>
  }

  export type ConversationExportUpdateWithWhereUniqueWithoutSessionInput = {
    where: ConversationExportWhereUniqueInput
    data: XOR<ConversationExportUpdateWithoutSessionInput, ConversationExportUncheckedUpdateWithoutSessionInput>
  }

  export type ConversationExportUpdateManyWithWhereWithoutSessionInput = {
    where: ConversationExportScalarWhereInput
    data: XOR<ConversationExportUpdateManyMutationInput, ConversationExportUncheckedUpdateManyWithoutSessionInput>
  }

  export type AgentSessionCreateWithoutMessagesInput = {
    id?: string
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserCreateNestedOneWithoutAgentSessionsInput
    exports?: ConversationExportCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionUncheckedCreateWithoutMessagesInput = {
    id?: string
    userId?: string | null
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    exports?: ConversationExportUncheckedCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionCreateOrConnectWithoutMessagesInput = {
    where: AgentSessionWhereUniqueInput
    create: XOR<AgentSessionCreateWithoutMessagesInput, AgentSessionUncheckedCreateWithoutMessagesInput>
  }

  export type AgentSessionUpsertWithoutMessagesInput = {
    update: XOR<AgentSessionUpdateWithoutMessagesInput, AgentSessionUncheckedUpdateWithoutMessagesInput>
    create: XOR<AgentSessionCreateWithoutMessagesInput, AgentSessionUncheckedCreateWithoutMessagesInput>
    where?: AgentSessionWhereInput
  }

  export type AgentSessionUpdateToOneWithWhereWithoutMessagesInput = {
    where?: AgentSessionWhereInput
    data: XOR<AgentSessionUpdateWithoutMessagesInput, AgentSessionUncheckedUpdateWithoutMessagesInput>
  }

  export type AgentSessionUpdateWithoutMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserUpdateOneWithoutAgentSessionsNestedInput
    exports?: ConversationExportUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionUncheckedUpdateWithoutMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    exports?: ConversationExportUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionCreateWithoutExportsInput = {
    id?: string
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserCreateNestedOneWithoutAgentSessionsInput
    messages?: AgentMessageCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionUncheckedCreateWithoutExportsInput = {
    id?: string
    userId?: string | null
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUncheckedCreateNestedManyWithoutSessionInput
  }

  export type AgentSessionCreateOrConnectWithoutExportsInput = {
    where: AgentSessionWhereUniqueInput
    create: XOR<AgentSessionCreateWithoutExportsInput, AgentSessionUncheckedCreateWithoutExportsInput>
  }

  export type UserCreateWithoutConversationExportsInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    agentSessions?: AgentSessionCreateNestedManyWithoutUserInput
    userSubscriptions?: UserSubscriptionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutConversationExportsInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    agentSessions?: AgentSessionUncheckedCreateNestedManyWithoutUserInput
    userSubscriptions?: UserSubscriptionUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutConversationExportsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutConversationExportsInput, UserUncheckedCreateWithoutConversationExportsInput>
  }

  export type AgentSessionUpsertWithoutExportsInput = {
    update: XOR<AgentSessionUpdateWithoutExportsInput, AgentSessionUncheckedUpdateWithoutExportsInput>
    create: XOR<AgentSessionCreateWithoutExportsInput, AgentSessionUncheckedCreateWithoutExportsInput>
    where?: AgentSessionWhereInput
  }

  export type AgentSessionUpdateToOneWithWhereWithoutExportsInput = {
    where?: AgentSessionWhereInput
    data: XOR<AgentSessionUpdateWithoutExportsInput, AgentSessionUncheckedUpdateWithoutExportsInput>
  }

  export type AgentSessionUpdateWithoutExportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    user?: UserUpdateOneWithoutAgentSessionsNestedInput
    messages?: AgentMessageUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionUncheckedUpdateWithoutExportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type UserUpsertWithoutConversationExportsInput = {
    update: XOR<UserUpdateWithoutConversationExportsInput, UserUncheckedUpdateWithoutConversationExportsInput>
    create: XOR<UserCreateWithoutConversationExportsInput, UserUncheckedCreateWithoutConversationExportsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutConversationExportsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutConversationExportsInput, UserUncheckedUpdateWithoutConversationExportsInput>
  }

  export type UserUpdateWithoutConversationExportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    agentSessions?: AgentSessionUpdateManyWithoutUserNestedInput
    userSubscriptions?: UserSubscriptionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutConversationExportsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    agentSessions?: AgentSessionUncheckedUpdateManyWithoutUserNestedInput
    userSubscriptions?: UserSubscriptionUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutUserSubscriptionsInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    agentSessions?: AgentSessionCreateNestedManyWithoutUserInput
    conversationExports?: ConversationExportCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUserSubscriptionsInput = {
    id?: string
    clerkUserId: string
    email: string
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
    isActive?: boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    lastLoginAt?: Date | string | null
    agentSessions?: AgentSessionUncheckedCreateNestedManyWithoutUserInput
    conversationExports?: ConversationExportUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutUserSubscriptionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUserSubscriptionsInput, UserUncheckedCreateWithoutUserSubscriptionsInput>
  }

  export type UserUpsertWithoutUserSubscriptionsInput = {
    update: XOR<UserUpdateWithoutUserSubscriptionsInput, UserUncheckedUpdateWithoutUserSubscriptionsInput>
    create: XOR<UserCreateWithoutUserSubscriptionsInput, UserUncheckedCreateWithoutUserSubscriptionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUserSubscriptionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUserSubscriptionsInput, UserUncheckedUpdateWithoutUserSubscriptionsInput>
  }

  export type UserUpdateWithoutUserSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    agentSessions?: AgentSessionUpdateManyWithoutUserNestedInput
    conversationExports?: ConversationExportUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUserSubscriptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    preferences?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    agentSessions?: AgentSessionUncheckedUpdateManyWithoutUserNestedInput
    conversationExports?: ConversationExportUncheckedUpdateManyWithoutUserNestedInput
  }

  export type AgentSessionCreateManyUserInput = {
    id?: string
    sessionTitle: string
    contentType: $Enums.ContentType
    contentSource: string
    contentUrl?: string | null
    contentText: string
    status?: $Enums.SessionStatus
    startedAt?: Date | string
    completedAt?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ConversationExportCreateManyUserInput = {
    id?: string
    sessionId: string
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
  }

  export type UserSubscriptionCreateManyUserInput = {
    id?: string
    subscriptionType: string
    status?: string
    startDate?: Date | string
    endDate?: Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentSessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUpdateManyWithoutSessionNestedInput
    exports?: ConversationExportUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    messages?: AgentMessageUncheckedUpdateManyWithoutSessionNestedInput
    exports?: ConversationExportUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type AgentSessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionTitle?: StringFieldUpdateOperationsInput | string
    contentType?: EnumContentTypeFieldUpdateOperationsInput | $Enums.ContentType
    contentSource?: StringFieldUpdateOperationsInput | string
    contentUrl?: NullableStringFieldUpdateOperationsInput | string | null
    contentText?: StringFieldUpdateOperationsInput | string
    status?: EnumSessionStatusFieldUpdateOperationsInput | $Enums.SessionStatus
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ConversationExportUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    session?: AgentSessionUpdateOneRequiredWithoutExportsNestedInput
  }

  export type ConversationExportUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ConversationExportUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserSubscriptionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type UserSubscriptionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    subscriptionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageCreateManySessionInput = {
    id?: string
    agentType: $Enums.AgentType
    messageContent: string
    messageOrder: number
    timestamp?: Date | string
    confidence?: number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ConversationExportCreateManySessionInput = {
    id?: string
    userId?: string | null
    exportFormat: $Enums.ExportFormat
    exportedAt?: Date | string
    filePath?: string | null
    downloadUrl?: string | null
    expiresAt?: Date | string | null
  }

  export type AgentMessageUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageUncheckedUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AgentMessageUncheckedUpdateManyWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    agentType?: EnumAgentTypeFieldUpdateOperationsInput | $Enums.AgentType
    messageContent?: StringFieldUpdateOperationsInput | string
    messageOrder?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    confidence?: NullableFloatFieldUpdateOperationsInput | number | null
    sources?: NullableJsonNullValueInput | InputJsonValue
    metadata?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ConversationExportUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutConversationExportsNestedInput
  }

  export type ConversationExportUncheckedUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ConversationExportUncheckedUpdateManyWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    exportFormat?: EnumExportFormatFieldUpdateOperationsInput | $Enums.ExportFormat
    exportedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    downloadUrl?: NullableStringFieldUpdateOperationsInput | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}