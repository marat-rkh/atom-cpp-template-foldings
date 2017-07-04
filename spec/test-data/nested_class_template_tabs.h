class One {};

template<
	typename A,
	class B,
	int N,
	template<class> class TT,
	typename C = One,
	typename = double
>
class Two
	: public One {
	int i;

	template<class Z> class Three {};
};
