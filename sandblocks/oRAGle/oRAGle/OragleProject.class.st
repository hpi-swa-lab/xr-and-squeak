Class {
	#name : #OragleProject,
	#superclass : #Object,
	#instVars : [
		'uuid',
		'label',
		'rootModule',
		'approvedPrice',
		'cachedPrompts'
	],
	#category : #oRAGle
}

{
	#category : #copying,
	#'squeak_changestamp' : 'ct 2/3/2024 18:23'
}
OragleProject >> adoptFrom: anotherProject [

	self assert: self uuid = anotherProject uuid.
	self label: anotherProject label.
	self rootModule: anotherProject rootModule.
	self approvedPrice: anotherProject approvedPrice.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/3/2024 18:19'
}
OragleProject >> approvedPrice [

	^ approvedPrice
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/3/2024 18:19'
}
OragleProject >> approvedPrice: cents [

	approvedPrice := cents.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/25/2024 20:38'
}
OragleProject >> expand [

	^ self rootModule expand
]

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'ct 2/3/2024 18:14'
}
OragleProject >> initialize [

	super initialize.
	
	cachedPrompts := Dictionary new.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/25/2024 20:10'
}
OragleProject >> label [

	^ label
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/25/2024 20:10'
}
OragleProject >> label: aString [

	label := aString.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/4/2024 00:11'
}
OragleProject >> metricsForModule: aModule [

	| allMetrics |
	allMetrics := self expand collect: [:prompt |
		prompt metricsForModule: aModule].
	
	^ JsonObject new
		
		minTokens: (allMetrics ifEmpty: [OpenAIAmount oragleNan] ifNotEmpty: [(allMetrics collect: #minTokens) min]);
		maxTokens: (allMetrics ifEmpty: [OpenAIAmount oragleNan] ifNotEmpty: [(allMetrics collect: #maxTokens) max]);
		
		minPrice: (allMetrics ifEmpty: [OpenAIAmount oragleNan] ifNotEmpty: [(allMetrics collect: #minPrice) min]);
		maxPrice: (allMetrics ifEmpty: [OpenAIAmount oragleNan] ifNotEmpty: [(allMetrics collect: #maxPrice) max]);
		
		yourself
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/3/2024 21:05'
}
OragleProject >> moduleForId: id [

	^ self rootModule moduleForId: id
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 2/3/2024 18:24'
}
OragleProject >> promptsWithOutputs [

	| prompts |
	prompts := self expand.
	^ prompts collect: [:prompt |
		cachedPrompts
			at: prompt promptKey
			ifAbsentPut:
				[approvedPrice ifNotNil:
					[prompt approvedPrice: approvedPrice.
					approvedPrice := approvedPrice - prompt priceToGenerateOutputs maxCents].
				prompt assureOutputs.
				prompt]]
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/25/2024 20:10'
}
OragleProject >> rootModule [

	^ rootModule
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/25/2024 20:11'
}
OragleProject >> rootModule: aModule [

	rootModule := aModule.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/2/2024 17:01'
}
OragleProject >> uuid [

	^ uuid
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/2/2024 17:01'
}
OragleProject >> uuid: anObject [

	uuid := anObject.
]
