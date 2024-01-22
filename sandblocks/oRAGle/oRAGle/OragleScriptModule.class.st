Class {
	#name : #OragleScriptModule,
	#superclass : #OragleModule,
	#category : #oRAGle
}

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 19:06'
}
OragleScriptModule >> accept: aVisitor [

	^ aVisitor visitScriptModule: self.
]

{
	#category : #accessing,
	#'squeak_changestamp' : 'ct 1/22/2024 12:10'
}
OragleScriptModule >> type [

	^ #script
]
