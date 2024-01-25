Class {
	#name : #OragleProject,
	#superclass : #Object,
	#instVars : [
		'root'
	],
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'ct 1/25/2024 10:54'
}
OragleProject >> expand [

	^ self root expand
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/25/2024 10:53'
}
OragleProject >> root [

	^ root
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/25/2024 10:53'
}
OragleProject >> root: aModule [

	root := aModule.
]
