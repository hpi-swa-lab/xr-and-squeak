Class {
	#name : #OragleProject,
	#superclass : #Object,
	#instVars : [
		'label',
		'rootModule'
	],
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/25/2024 20:38'
}
OragleProject >> expand [

	^ self rootModule expand
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
