Class {
	#name : #OragleModule,
	#superclass : #Object,
	#instVars : [
		'uuid',
		'label',
		'children',
		'state'
	],
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:05'
}
OragleModule >> accept: aVisitor [

	^ self subclassResponsibility.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/19/2024 16:18'
}
OragleModule >> children [

	^ children
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 11:47'
}
OragleModule >> children: aCollection [

	children := aCollection.
]

{
	#category : #defaults,
	#'squeak_changestamp' : 'lubo 1/19/2024 17:14'
}
OragleModule >> defaultLabel [
	
	^ ''
]

{
	#category : #defaults,
	#'squeak_changestamp' : 'lubo 1/19/2024 17:13'
}
OragleModule >> defaultState [
	
	^ #enabled
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 15:13'
}
OragleModule >> enabledChildren [

	| isSolo |
	isSolo := self children anySatisfy: [:child | child isSolo].
	^ self children
		select: [:child | (isSolo ==> [child isSolo]) and: [child isMute not]]
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 15:14'
}
OragleModule >> enabledChildrenDo: aBlock [

	^ self enabledChildren do: aBlock
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/22/2024 17:01'
}
OragleModule >> expand [

	^ OraglePromptVisitor new
		rootModule: self;
		value
]

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'lubo 1/19/2024 21:50'
}
OragleModule >> initialize [
	
	children := OrderedCollection new.
	
	state := self defaultState.
	label := self defaultLabel.
]

{
	#category : #testing,
	#'squeak_changestamp' : 'ct 1/22/2024 15:09'
}
OragleModule >> isEnabled [

	^ self state = #enabled
]

{
	#category : #testing,
	#'squeak_changestamp' : 'ct 1/22/2024 15:09'
}
OragleModule >> isMute [

	^ self state = #mute
]

{
	#category : #testing,
	#'squeak_changestamp' : 'ct 1/22/2024 15:09'
}
OragleModule >> isSolo [

	^ self state = #solo
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/19/2024 15:46'
}
OragleModule >> label [

	^ label
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 11:47'
}
OragleModule >> label: aString [

	label := aString.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/3/2024 23:32'
}
OragleModule >> leaves [

	^ (self children ifEmpty: [^ {self}])
		gather: #leaves
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/3/2024 21:06'
}
OragleModule >> moduleForId: id [

	self uuid = id ifTrue: [^ self].
	self children do: [:child |
		(child moduleForId: id) ifNotNil: [:module | ^ module]].
	^ nil
]

{
	#category : #printing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:11'
}
OragleModule >> printContentOn: aStream [

	aStream print: self children.
]

{
	#category : #printing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:15'
}
OragleModule >> printOn: aStream [

	(#(sequence) includes: self type) ifFalse:
		[aStream
			nextPut: $[;
			nextPutAll: self type;
			nextPut: $]].
	self state = #enabled ifFalse:
		[aStream
			nextPut: $<;
			nextPutAll: self state;
			nextPut: $>].
	self printContentOn: aStream.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'lubo 1/19/2024 17:12'
}
OragleModule >> state [

	^ state
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 11:49'
}
OragleModule >> state: aSymbol [

	self assert: (#(enabled mute solo) includes: aSymbol).
	state := aSymbol.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:10'
}
OragleModule >> type [

	^ self subclassResponsibility
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/2/2024 17:00'
}
OragleModule >> uuid [

	^ uuid
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 2/2/2024 17:00'
}
OragleModule >> uuid: anObject [ 

	uuid := anObject
]
