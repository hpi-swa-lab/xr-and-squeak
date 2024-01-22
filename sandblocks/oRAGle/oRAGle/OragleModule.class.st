Class {
	#name : #OragleModule,
	#superclass : #Object,
	#instVars : [
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
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 15:46'
}
OragleModule >> expand [

	self subclassResponsibility.
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
